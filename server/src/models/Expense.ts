import mongoose, { Document } from "mongoose";

export interface IExpense extends Document {
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
}

const expenseSchema = new mongoose.Schema<IExpense>({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: "General" },
  date: { type: Date, default: Date.now },
});

export default mongoose.model<IExpense>("Expense", expenseSchema);
