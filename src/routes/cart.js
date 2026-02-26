import express from "express";
import {
  addToCartController,
  getCartController,
  clearCartController,
} from "../controllers/cart.js";

const router = express.Router();

router.post("/", addToCartController);
router.get("/:userId", getCartController);
router.delete("/:userId/clear", clearCartController);

export default router;
