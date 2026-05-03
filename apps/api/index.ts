import "dotenv/config";
import jwt from "jsonwebtoken";
import express from "express";
import cors from "cors";
const app = express();
import { prismaClient } from "store/client";
import { AuthInput } from "./types";
import { authMiddleware } from "./middleware";

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// creating the website 
app.post("/website", authMiddleware, async (req, res) => {
  try {
    if (!req.body.url) {
      res.status(411).json({ error: "URL is required" });
      return;
    }
    const website = await prismaClient.website.create({
      data: {
        url: req.body.url,
        time_added: new Date(),
        user_id: req.userId!,
      },
    });

    res.json({ id: website.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create website" });
  }
});


// getting all the websites
app.get("/website/all", authMiddleware, async (req, res) => {
  try {
    const websites = await prismaClient.website.findMany({
      where: { user_id: req.userId! },
      include: {
        ticks: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    res.json(websites);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch websites" });
  }
});


// checking the status of the websites 
app.get("/status/:websiteId", authMiddleware, async (req, res) => {
  try {
    const website = await prismaClient.website.findFirst({
      where: {
        user_id: req.userId!,
        id: req.params.websiteId,
      },
      include: {
        ticks: {
          orderBy: [{ createdAt: "desc" }],
          take: 10,
        },
      },
    });

    if (!website) {
      res.status(404).json({ error: "Website not found" });
      return;
    }

    res.json({
      url: website.url,
      id: website.id,
      user_id: website.user_id,
      ticks: website.ticks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// signing up
app.post("/user/signup", async (req, res) => {
  try {
    const data = AuthInput.safeParse(req.body);
    if (!data.success) {
      res.status(400).json({ error: data.error.errors });
      return;
    }

    const user = await prismaClient.user.create({
      data: {
        username: data.data.username,
        password: data.data.password,
      },
    });
    res.json({ id: user.id });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "User already exists" });
  }
});

// signing in 

app.post("/user/signin", async (req, res) => {
  try {
    const data = AuthInput.safeParse(req.body);
    if (!data.success) {
      res.status(400).json({ error: data.error.errors });
      return;
    }

    const user = await prismaClient.user.findFirst({
      where: {
        username: data.data.username,
      },
    });

    if (!user || user.password !== data.data.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!);

    res.json({ jwt: token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sign in failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});