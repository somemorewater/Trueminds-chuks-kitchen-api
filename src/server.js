import "./config/env.js";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Check your .env file.");
  process.exit(1);
}

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

startServer();
