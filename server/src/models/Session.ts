import mongoose, { Document } from "mongoose";

export interface ISession extends Document {
  userId: string;
  startTime: Date;
  endTime: Date;
  moodBefore: string;
  moodAfter: string;
  focusLevel: number;
  distractions?: string;
  mode: string;
  backgroundImageUrl?: string;
  journal?: string;
}

const sessionSchema = new mongoose.Schema<ISession>({
  userId: { type: String, required: true },
  startTime: Date,
  endTime: Date,
  moodBefore: String,
  moodAfter: String,
  focusLevel: Number,
  distractions: String,
  mode: { type: String, required: true },
  backgroundImageUrl: String,
  journal: String,
});

export default mongoose.model<ISession>("Session", sessionSchema);
