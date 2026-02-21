import express from "express";
import {
  signupController,
  verifyOtpController,
  loginController,
  resendOtpController,
} from "../controllers/auth.js";

const router = express.Router();

// Signup
router.post("/signup", signupController);

// Verify OTP
router.post("/verify-otp", verifyOtpController);

// Resend OTP
router.post("/resend-otp", resendOtpController);

// Login
router.post("/login", loginController);

export default router;
