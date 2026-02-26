import express from "express";
import authRoutes from "./routes/auth.js";
import foodRoutes from "./routes/food.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/order.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

export default app;
