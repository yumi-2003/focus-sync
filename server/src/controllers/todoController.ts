import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Todo from "../models/Todo";

export const getTodos = async (req: AuthRequest, res: Response) => {
  try {
    const todos = await Todo.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const createTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ msg: "Text is required" });

    const newTodo = new Todo({
      userId: req.userId,
      text,
    });

    const saved = await newTodo.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateTodoStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { completed } = req.body;
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.userId });

    if (!todo) return res.status(404).json({ msg: "Todo not found" });

    todo.completed = completed;
    await todo.save();

    res.json(todo);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!todo) return res.status(404).json({ msg: "Todo not found" });

    res.json({ msg: "Todo deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
