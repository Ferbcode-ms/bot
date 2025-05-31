import express from "express";
import Question from "../models/Question.js";
import UserSession from "../models/UserSession.js";

const router = express.Router();

// Get all questions
router.get("/questions", async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};

    const questions = await Question.find(query);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get random question by category
router.get("/questions/random", async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const count = await Question.countDocuments({ category });

    if (count === 0) {
      return res.status(404).json({
        message: "No questions found for this category",
        category: category,
      });
    }

    const random = Math.floor(Math.random() * count);
    const question = await Question.findOne({ category }).skip(random);

    if (!question) {
      return res
        .status(500)
        .json({ message: "Error fetching random question" });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Question.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get question count by category
router.get("/questions/count", async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const count = await Question.countDocuments({ category });
    res.json({ count });
  } catch (error) {
    console.error("Error in /questions/count:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/session/start → starts session for user
router.post("/session/start", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Find if an active session exists for the user
    let session = await UserSession.findOne({ userId: userId });

    if (session) {
      // If session exists, update its start time
      session.sessionStartTime = new Date();
      await session.save();
      console.log("Existing session updated for user:", {
        userId,
        startTime: session.sessionStartTime,
      });
      res.status(200).json({
        message: "Session updated successfully",
        startTime: session.sessionStartTime,
      });
    } else {
      // If no session exists, create a new one
      session = new UserSession({
        userId: userId,
        sessionStartTime: new Date(),
      });
      await session.save();
      console.log("New session created for user:", {
        userId,
        startTime: session.sessionStartTime,
      });
      res.status(201).json({
        message: "Session created successfully",
        startTime: session.sessionStartTime,
      });
    }
  } catch (err) {
    console.error("Error starting/updating session:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/session/check/:userId → check if session expired
router.get("/session/check/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const session = await UserSession.findOne({ userId: userId });

    if (!session) {
      console.log("No session found for user:", userId);
      return res.json({ expired: true });
    }

    const now = new Date();
    const sessionStartTime = session.sessionStartTime;
    const timeDiff = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60); // in minutes

    console.log("Session check:", {
      userId,
      sessionStartTime,
      now,
      timeDiff,
      expired: timeDiff >= 3,
    });

    if (timeDiff >= 3) {
      // Delete expired session
      await UserSession.deleteOne({ userId: userId });
      console.log("Session expired and deleted for user:", userId);
      return res.json({ expired: true });
    }

    res.json({ expired: false });
  } catch (err) {
    console.error("Error checking session:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/session/renew → renews session when user clicks "Renew" on website
router.post("/session/renew", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Delete any existing session
    await UserSession.deleteOne({ userId: userId });

    // Create new session
    const session = new UserSession({
      userId: userId,
      sessionStartTime: new Date(),
    });
    await session.save();

    console.log("Session renewed for user:", userId);
    res.json({
      message: "Session renewed successfully",
      startTime: session.sessionStartTime,
    });
  } catch (err) {
    console.error("Error renewing session:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
