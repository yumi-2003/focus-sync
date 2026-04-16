import mongoose, { Document } from "mongoose";

export interface ITodo extends Document {
  userId: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

const todoSchema = new mongoose.Schema<ITodo>({
  userId: { type: String, required: true },
  text: { 
    type: String, 
    required: [true, "Task text is required"],
    maxlength: [100, "Task text cannot exceed 100 characters"]
  },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITodo>("Todo", todoSchema);
