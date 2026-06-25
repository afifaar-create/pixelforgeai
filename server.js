import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";

const app = express();
const dataDir = path.resolve("data");
const usersFile = path.join(dataDir, "users.json");
const historyFile = path.join(dataDir, "history.json");
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, "[]", "utf8");
  }
  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, "[]", "utf8");
  }
}

function readJson(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || "null") || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

ensureDataFiles();

app.post("/register", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: "Name and phone are required." });
  }

  const users = readJson(usersFile);
  const existing = users.find((user) => user.phone === phone);
  if (existing) {
    return res.status(409).json({ success: false, error: "Phone already registered." });
  }

  const newUser = {
    id: `${Date.now()}`,
    name,
    phone,
    subscription: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJson(usersFile, users);
  res.json({ success: true, user: newUser });
});

app.post("/login", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: "Phone is required." });
  }

  const users = readJson(usersFile);
  const user = users.find((item) => item.phone === phone);
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  res.json({ success: true, user });
});

app.post("/subscribe", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: "User ID is required." });
  }

  const users = readJson(usersFile);
  const userIndex = users.findIndex((item) => item.id === userId);
  if (userIndex < 0) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  users[userIndex].subscription = true;
  writeJson(usersFile, users);
  res.json({ success: true, user: users[userIndex] });
});

app.post("/generate", async (req, res) => {
  try {
    const { prompt, userId, count, mode } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required." });
    }

    const imageCount = Math.min(Math.max(Number(count) || 1, 1), 4);
    const promptMode = mode === "edit" ? `Edited version of: ${prompt}` : mode === "upscale" ? `High-resolution upscale of: ${prompt}` : prompt;

    const images = [];
    if (openai) {
      const result = await openai.images.generate({
        prompt: promptMode,
        n: imageCount,
        size: "1024x1024"
      });
      for (const item of result.data) {
        if (item.url) {
          images.push(item.url);
        } else if (item.b64_json) {
          images.push(`data:image/png;base64,${item.b64_json}`);
        }
      }
    } else {
      const encodedPrompt = encodeURIComponent(promptMode);
      for (let index = 0; index < imageCount; index += 1) {
        images.push(`https://image.pollinations.ai/prompt/${encodedPrompt}?v=${Date.now()}-${index}`);
      }
    }

    if (userId) {
      const history = readJson(historyFile);
      history.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        prompt,
        mode: mode || "generate",
        images,
        createdAt: new Date().toISOString()
      });
      writeJson(historyFile, history);
    }

    res.json({ success: true, images, image: images[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Image generation failed." });
  }
});

function getFallbackChatReply(prompt) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) {
    return "I can help answer questions or suggest image prompts. Ask me anything!";
  }
  if (normalized.includes("hello") || normalized.includes("hi")) {
    return "Hello! I can't access the OpenAI service right now, but I can still help with basic questions about the app.";
  }
  if (normalized.includes("image")) {
    return "Tell me what kind of image you want, and I can suggest a good prompt or describe how to refine it.";
  }
  if (normalized.includes("help") || normalized.includes("support")) {
    return "This chat is in fallback mode because the OpenAI API key is not configured. I can provide basic guidance about the app and image generation workflow.";
  }
  return `OpenAI is not available right now, but I can still help with your prompt: ${prompt}`;
}

app.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required." });
    }

    if (!openai) {
      const reply = getFallbackChatReply(prompt);
      return res.json({ success: true, reply, fallback: true });
    }

    const response = await openai.responses.create({
      model: "gpt-3.5-turbo",
      input: prompt,
      max_tokens: 250,
      temperature: 0.8
    });

    const reply = response.output[0]?.content?.map((item) => item.text).join("") || "I could not generate a response.";
    res.json({ success: true, reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Chat request failed." });
  }
});

app.get("/history", (req, res) => {
  const { userId } = req.query;
  const history = readJson(historyFile);
  res.json({ success: true, history: userId ? history.filter((item) => item.userId === userId) : history });
});

app.get("/system", (req, res) => {
  const systemInfo = {
    hostname: os.hostname(),
    platform: process.platform,
    release: os.release(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    memory: {
      totalMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMB: Math.round(os.freemem() / 1024 / 1024)
    }
  };
  res.json({ success: true, systemInfo });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PixelForge AI server running at http://localhost:${PORT}`);
});