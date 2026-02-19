import express from "express";
import { signupController } from "../controllers/auth.js";
import { signupSchema } from "../validations/auth.js";

const router = express.Router();

router.post("/signup", signupController);

export default router;
