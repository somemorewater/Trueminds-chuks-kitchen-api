import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Order, { ORDER_STATUSES } from "../models/Order.js";

const TERMINAL_STATUSES = new Set(["Completed", "Cancelled"]);

export const createOrderController = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.food",
      "name price isAvailable",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cannot place order with empty cart" });
    }

    const unavailableItems = cart.items.filter((item) => !item.food?.isAvailable);
    if (unavailableItems.length > 0) {
      return res.status(409).json({
        message: "Some cart items are unavailable",
        unavailableItems: unavailableItems.map((item) => ({
          foodId: item.food?._id,
          name: item.food?.name,
        })),
      });
    }

    const orderItems = cart.items.map((item) => {
      const subtotal = item.food.price * item.quantity;
      return {
        food: item.food._id,
        name: item.food.name,
        price: item.food.price,
        quantity: item.quantity,
        subtotal,
      };
    });

    const totalPrice = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalPrice,
      status: "Pending",
    });

    cart.items = [];
    await cart.save();

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOrderByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateOrderStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actor } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
        allowedStatuses: ORDER_STATUSES,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (TERMINAL_STATUSES.has(order.status)) {
      return res.status(409).json({
        message: `Cannot update order from terminal status: ${order.status}`,
      });
    }

    if (status === "Cancelled") {
      const cancelledBy = actor === "admin" ? "admin" : "customer";
      order.cancelledBy = cancelledBy;
      order.status = "Cancelled";
      await order.save();
      return res.status(200).json({
        message: `Order cancelled by ${cancelledBy}`,
        order,
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({ message: "Order status updated", order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
