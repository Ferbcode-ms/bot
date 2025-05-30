import "dotenv/config";
import mongoose from "mongoose";
import Question from "../server/models/Question.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

// Read and parse the JSON file
const questionsData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "punjab_history_quiz_grouped_by_category.json"),
    "utf8"
  )
);

// Function to load questions
async function loadQuestions() {
  try {
    // Clear existing questions
    await Question.deleteMany({});
    console.log("Cleared existing questions");

    // Process each category
    for (const [category, questions] of Object.entries(questionsData)) {
      // Trim whitespace from category name
      const trimmedCategory = category.trim();

      // Add category to each question
      const questionsWithCategory = questions.map((q) => ({
        ...q,
        category: trimmedCategory,
      }));

      // Insert questions for this category
      await Question.insertMany(questionsWithCategory);
      console.log(
        `Loaded ${questions.length} questions for category: ${trimmedCategory}`
      );
    }

    console.log("All questions loaded successfully!");
  } catch (error) {
    console.error("Error loading questions:", error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the load function
loadQuestions();
