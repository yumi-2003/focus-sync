import { Request, Response } from "express";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const createAuthResponse = (user: IUser) => {
  const userId = String(user._id);
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });

  return {
    token,
    user: {
      _id: userId,
      username: user.username,
      email: user.email,
    },
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email: email?.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ msg: "Email is already registered" });
    }

    const hashed = await bcrypt.hash(password || "", 10);
    const user = new User({ 
      username: username?.trim(), 
      email: email?.trim().toLowerCase(), 
      password: hashed 
    });

    // Manually trigger validation to catch errors before saving
    const validationError = user.validateSync();
    if (validationError) {
      const firstError = Object.values(validationError.errors)[0].message;
      return res.status(400).json({ msg: firstError });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    await user.save();
    return res.status(201).json(createAuthResponse(user));
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors)[0] as any;
      return res.status(400).json({ msg: msg.message });
    }
    console.error("Register failed", error);
    return res.status(500).json({ msg: "Unable to register right now" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email) return res.status(400).json({ msg: "Email is required" });
    if (!password) return res.status(400).json({ msg: "Password is required" });

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ msg: "Wrong password" });
    }

    return res.json(createAuthResponse(user));
  } catch (error) {
    console.error("Login failed", error);
    return res.status(500).json({ msg: "Unable to login right now" });
  }
};
