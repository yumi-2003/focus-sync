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
    const username = req.body.username?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!username || !email || !password) {
      return res.status(400).json({ msg: "Username, email, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ msg: "Email is already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    return res.status(201).json(createAuthResponse(user));
  } catch (error) {
    console.error("Register failed", error);
    return res.status(500).json({ msg: "Unable to register right now" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

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
