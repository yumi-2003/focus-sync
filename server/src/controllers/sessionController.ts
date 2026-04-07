import { Response } from "express";
import Session from "../models/Session";
import { AuthRequest } from "../middleware/authMiddleware";

// POST /api/sessions — save a finished session
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startTime, endTime, moodBefore, moodAfter, focusLevel, distractions, mode } = req.body;

    if (!mode) {
      return res.status(400).json({ msg: "mode is required" });
    }

    // If a file was uploaded via multer, build its public URL
    const backgroundImageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : undefined;

    const session = await Session.create({
      userId,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : new Date(),
      moodBefore,
      moodAfter,
      focusLevel: Number(focusLevel) || 5,
      distractions,
      mode,
      backgroundImageUrl,
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error("createSession error", error);
    return res.status(500).json({ msg: "Could not save session" });
  }
};

// GET /api/sessions — list all sessions for the authenticated user (newest first)
export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sessions = await Session.find({ userId }).sort({ endTime: -1 });
    return res.json(sessions);
  } catch (error) {
    console.error("getSessions error", error);
    return res.status(500).json({ msg: "Could not fetch sessions" });
  }
};
