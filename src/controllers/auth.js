import redisClient from "../utils/redis.js";
import { sendEmail } from "../utils/email.js";
import User from "../models/User.js";
import { signupSchema } from "../validations/auth.js";

export const signupController = async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    const { name, email, phone, password, referralCode } = validatedData;

    const orQuery = [];
    if (email) orQuery.push({ email });
    if (phone) orQuery.push({ phone });

    const existingUser = await User.findOne({ $or: orQuery });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const isVerified = email ? false : true;

    const newUser = await User.create({
      name,
      email,
      phone,
      password,
      referralCode,
      isVerified,
    });

    if (email) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redisClient.setEx(`otp:${email}`, 300, otp);

      await sendEmail(
        email,
        "Verify your Chuks Kitchen account",
        `Your OTP is ${otp}. It expires in 5 minutes.`,
      );
    }

    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.status(201).json({
      message:
        "User created successfully. Please verify your email if provided.",
      user: safeUser,
    });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ errors: err.errors });
    }
    res.status(500).json({ error: "Server error" });
  }
};
