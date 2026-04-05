import mongoose, { Document } from "mongoose";

export interface ISession extends Document {
  userId: string;
  startTime: Date;
  endTime: Date;
  moodBefore: string;
  moodAfter: string;
  focusLevel: number;
  distractions?: string;
}

const sessionSchema = new mongoose.Schema<ISession>({
  userId: { type: String, required: true },
  startTime: Date,
  endTime: Date,
  moodBefore: String,
  moodAfter: String,
  focusLevel: Number,
  distractions: String,
});

export default mongoose.model<ISession>("Session", sessionSchema);
