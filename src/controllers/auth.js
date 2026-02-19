import User from "../models/User.js";
import { signupSchema } from "../validations/auth.js";

const { name, email, phone, password, referralCode } = validatedData;
const isVerified = email ? false : true;

const newUser = await User.create({
  name,
  email,
  phone,
  password,
  referralCode,
  isVerified,
});

export const signupController = async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    res.status(200).json({
      message: "Validation passed",
      data: validatedData,
    });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ errors: err.errors });
    }
    res.status(500).json({ error: "Server error" });
  }
};
