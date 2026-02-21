import redisClient from "../utils/redis.js";
import { sendEmail } from "../utils/email.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { resendOtpSchema, signupSchema } from "../validations/auth.js";

export const signupController = async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    const { name, email, phone, password, referralCode } = validatedData;
    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;

    const orQuery = [];
    if (normalizedEmail) orQuery.push({ email: normalizedEmail });
    if (phone) orQuery.push({ phone });

    const existingUser = await User.findOne({ $or: orQuery });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const isVerified = normalizedEmail ? false : true;

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password,
      referralCode,
      isVerified,
    });

    if (normalizedEmail) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redisClient.setEx(`otp:${normalizedEmail}`, 300, otp);

      await sendEmail(
        normalizedEmail,
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
    console.error(err);
    if (err.name === "ZodError") {
      return res.status(400).json({ errors: err.errors });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid OTP format" });
    }

    const storedOtp = await redisClient.get(`otp:${normalizedEmail}`);
    if (!storedOtp) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { isVerified: true },
      { returnDocument: "after" },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await redisClient.del(`otp:${normalizedEmail}`);

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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret not configured" });
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

export const resendOtpController = async (req, res) => {
  try {
    const validatedData = resendOtpSchema.parse(req.body);
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.email) {
      return res.status(400).json({ message: "Email is required for OTP" });
    }
    if (user.isVerified) {
      return res.status(409).json({ message: "Email already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.setEx(`otp:${normalizedEmail}`, 300, otp);

    await sendEmail(
      normalizedEmail,
      "Verify your Chuks Kitchen account",
      `Your OTP is ${otp}. It expires in 5 minutes.`,
    );

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error(err);
    if (err.name === "ZodError") {
      return res.status(400).json({ errors: err.errors });
    }
    res.status(500).json({ message: "Server error" });
  }
};
