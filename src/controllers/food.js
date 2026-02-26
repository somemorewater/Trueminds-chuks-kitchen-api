import mongoose from "mongoose";
import Food from "../models/Food.js";

export const getFoodsController = async (_req, res) => {
  try {
    const foods = await Food.find({ isAvailable: true }).sort({ createdAt: -1 });
    return res.status(200).json({ foods });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createFoodController = async (req, res) => {
  try {
    const { name, description, price, isAvailable } = req.body;

    if (!name || !description || price === undefined) {
      return res
        .status(400)
        .json({ message: "name, description and price are required" });
    }

    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({ message: "price must be a positive number" });
    }

    const food = await Food.create({
      name: name.trim(),
      description: description.trim(),
      price,
      isAvailable: typeof isAvailable === "boolean" ? isAvailable : true,
    });

    return res.status(201).json({ message: "Food created", food });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateFoodController = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, isAvailable, name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid food ID" });
    }

    const updates = {};

    if (price !== undefined) {
      if (typeof price !== "number" || price < 0) {
        return res
          .status(400)
          .json({ message: "price must be a positive number" });
      }
      updates.price = price;
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({ message: "isAvailable must be boolean" });
      }
      updates.isAvailable = isAvailable;
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res
          .status(400)
          .json({ message: "description must be a non-empty string" });
      }
      updates.description = description.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const food = await Food.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    return res.status(200).json({ message: "Food updated", food });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteFoodController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid food ID" });
    }

    const food = await Food.findByIdAndUpdate(
      id,
      { isAvailable: false },
      { new: true, runValidators: true },
    );

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    return res
      .status(200)
      .json({ message: "Food marked unavailable", food });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
