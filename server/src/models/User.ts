import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
}

const userSchema = new mongoose.Schema<IUser>({
  username: { 
    type: String, 
    required: [true, "Username is required"], 
    trim: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username cannot exceed 20 characters"]
  },
  email: { 
    type: String, 
    required: [true, "Email is required"], 
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"]
  },
  password: { 
    type: String, 
    required: [true, "Password is required"] 
  },
});

export default mongoose.model<IUser>("User", userSchema);
