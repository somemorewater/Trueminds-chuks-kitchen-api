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

export const verifyOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid OTP format" });
    }

    const storedOtp = await redisClient.get(`otp:${email}`);
    if (!storedOtp) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await redisClient.del(`otp:${email}`);

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "Email verified successfully",
      user: safeUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

