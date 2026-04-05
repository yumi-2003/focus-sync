import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import { Request, Response } from "express";

import authRoutes from "./routes/authRoute";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

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
