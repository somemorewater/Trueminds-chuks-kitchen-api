import express from "express";
import {
  signupController,
  verifyOtpController,
  loginController,
} from "../controllers/auth.js";

const router = express.Router();

// Signup
router.post("/signup", signupController);

// Verify OTP
router.post("/verify-otp", verifyOtpController);

// Login
router.post("/login", loginController);

export default router;
