import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Food from "../models/Food.js";

export const addToCartController = async (req, res) => {
  try {
    const { userId, foodId, quantity = 1 } = req.body;

    if (!userId || !foodId) {
      return res.status(400).json({ message: "userId and foodId are required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(foodId)
    ) {
      return res.status(400).json({ message: "Invalid userId or foodId" });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "quantity must be an integer >= 1" });
    }

    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    if (!food.isAvailable) {
      return res.status(409).json({ message: "Food is currently unavailable" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ food: foodId, quantity }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.food.toString() === foodId,
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ food: foodId, quantity });
      }
    }

    await cart.save();
    const populatedCart = await Cart.findOne({ user: userId }).populate(
      "items.food",
      "name description price isAvailable",
    );

    return res.status(200).json({ message: "Cart updated", cart: populatedCart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCartController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.food",
      "name description price isAvailable",
    );

    if (!cart) {
      return res.status(200).json({ cart: { user: userId, items: [] } });
    }

    return res.status(200).json({ cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const clearCartController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items: [] },
      { new: true, upsert: true },
    );

    return res.status(200).json({ message: "Cart cleared", cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
