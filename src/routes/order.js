import express from "express";
import {
  createOrderController,
  getOrderByIdController,
  updateOrderStatusController,
} from "../controllers/order.js";

const router = express.Router();

router.post("/", createOrderController);
router.get("/:id", getOrderByIdController);
router.patch("/:id/status", updateOrderStatusController);

export default router;
