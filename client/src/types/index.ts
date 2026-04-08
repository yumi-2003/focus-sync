export interface User {
  _id: string;
  email: string;
}

export type Mood = "happy" | "focused" | "tired" | "stressed" | "neutral";

export interface Session {
  _id?: string;
  user: User;
  startTime: string; // ISO string format
  endTime: string; // ISO string format
  moodBefore: Mood;
  moodAfter: Mood;
  focusLevel: number;
  distractions?: string;
  journal?: string;
}
