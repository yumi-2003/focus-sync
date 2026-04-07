import express from "express";
import multer from "multer";
import path from "path";
import { protect } from "../middleware/authMiddleware";
import { createSession, getSessions } from "../controllers/sessionController";

const router = express.Router();

// Configure multer disk storage — saves files to ./uploads with unique filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

router.post("/", protect, upload.single("backgroundImage"), createSession);
router.get("/", protect, getSessions);

export default router;
