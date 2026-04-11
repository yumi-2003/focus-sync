import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import path from "path";
import { Request, Response } from "express";
import fs from "fs";

import authRoutes from "./routes/authRoute";
import sessionRoutes from "./routes/sessionRoute";
import todoRoutes from "./routes/todoRoute";

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/todos", todoRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Focus Sync Server is running");
});

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server is running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
