import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getTodos, createTodo, updateTodoStatus, deleteTodo } from "../controllers/todoController";

const router = express.Router();

router.get("/", protect, getTodos);
router.post("/", protect, createTodo);
router.put("/:id", protect, updateTodoStatus);
router.delete("/:id", protect, deleteTodo);

export default router;
