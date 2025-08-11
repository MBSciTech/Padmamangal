import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";
import fs from "fs";
import { fileURLToPath } from "url";
import path, { dirname, join, resolve } from "path";

// Resolve __dirname in ES modules and ensure uploads directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir)); // Serve static files

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  const protocol = (req.headers["x-forwarded-proto"] || req.protocol || "http").replace(/:$/, "");
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// LiveKit access token endpoint
app.post("/livekit-token", (req, res) => {
  const { roomName, identity } = req.body || {};
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
  if (!roomName || !identity) {
    return res.status(400).json({ error: "roomName and identity are required" });
  }
  try {
    const at = new AccessToken(apiKey, apiSecret, { identity });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    const token = at.toJwt();
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "Failed to create token" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
