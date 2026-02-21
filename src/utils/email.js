import "../config/env.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Chuks Kitchen" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error("Error sending email:", err);
    throw new Error("Failed to send email");
  }
};
