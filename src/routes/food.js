import express from "express";
import {
  getFoodsController,
  createFoodController,
  updateFoodController,
  deleteFoodController,
} from "../controllers/food.js";

const router = express.Router();

router.get("/", getFoodsController);
router.post("/", createFoodController);
router.patch("/:id", updateFoodController);
router.delete("/:id", deleteFoodController);

export default router;
