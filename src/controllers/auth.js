import redisClient from "../utils/redis.js";
import { sendEmail } from "../utils/email.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
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

export const loginController = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res
        .status(400)
        .json({ message: "Email or phone + password required" });
    }

    const user = await User.findOne({
      $or: [email ? { email } : null, phone ? { phone } : null].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email && !user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
