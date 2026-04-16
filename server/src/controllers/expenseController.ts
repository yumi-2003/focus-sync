import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Expense from "../models/Expense";

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { description, amount, category, date } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ msg: "Description and amount are required" });
    }

    const newExpense = new Expense({
      userId: req.userId,
      description,
      amount,
      category,
      date: date || new Date(),
    });

    const saved = await newExpense.save();
    res.json(saved);
  } catch (err: any) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors)[0] as any;
      return res.status(400).json({ msg: msg.message });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!expense) return res.status(404).json({ msg: "Expense not found" });

    res.json({ msg: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
