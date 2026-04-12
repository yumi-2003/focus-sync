import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getExpenses, createExpense, deleteExpense } from "../controllers/expenseController";

const router = express.Router();

router.get("/", protect, getExpenses);
router.post("/", protect, createExpense);
router.delete("/:id", protect, deleteExpense);

export default router;
