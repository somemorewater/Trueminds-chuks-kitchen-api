import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"],
  });

export const resendOtpSchema = z.object({
  email: z.string().email(),
});
