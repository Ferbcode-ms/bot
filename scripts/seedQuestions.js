import "dotenv/config";
import mongoose from "mongoose";
import Question from "../server/models/Question.js";

const sampleQuestions = [
  {
    category: "Ancient History",
    question: "Which ancient civilization flourished in the Indus Valley?",
    options: ["Mesopotamia", "Harappan", "Egyptian", "Greek"],
    answer: "Harappan",
  },
  {
    category: "Ancient History",
    question:
      "What was the main occupation of the people of the Indus Valley Civilization?",
    options: ["Farming", "Trading", "Fishing", "Hunting"],
    answer: "Farming",
  },
  {
    category: "Sikh History",
    question: "Who was the first Guru of Sikhism?",
    options: [
      "Guru Nanak",
      "Guru Gobind Singh",
      "Guru Arjan",
      "Guru Tegh Bahadur",
    ],
    answer: "Guru Nanak",
  },
  {
    category: "Sikh History",
    question: "In which year was the Khalsa Panth established?",
    options: ["1699", "1708", "1710", "1715"],
    answer: "1699",
  },
  {
    category: "Modern History",
    question: "When did the First Anglo-Sikh War take place?",
    options: ["1845-1846", "1848-1849", "1857", "1877"],
    answer: "1845-1846",
  },
  {
    category: "Modern History",
    question: "Who was the last Maharaja of the Sikh Empire?",
    options: [
      "Maharaja Ranjit Singh",
      "Maharaja Duleep Singh",
      "Maharaja Sher Singh",
      "Maharaja Kharak Singh",
    ],
    answer: "Maharaja Duleep Singh",
  },
  {
    category: "Post-1947 Punjab",
    question: "When was the state of Punjab reorganized on a linguistic basis?",
    options: ["1956", "1966", "1971", "1984"],
    answer: "1966",
  },
  {
    category: "Post-1947 Punjab",
    question: "Which city is the capital of Punjab, India?",
    options: ["Amritsar", "Ludhiana", "Chandigarh", "Jalandhar"],
    answer: "Chandigarh",
  },
  {
    category: "Geography",
    question: "Which river is known as the lifeline of Punjab?",
    options: ["Ganges", "Yamuna", "Sutlej", "Beas"],
    answer: "Sutlej",
  },
  {
    category: "Geography",
    question: "What is the main crop grown in Punjab?",
    options: ["Rice", "Wheat", "Cotton", "Sugarcane"],
    answer: "Wheat",
  },
];

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("MongoDB connected for seeding...");
    try {
      // Clear existing questions (optional)
      await Question.deleteMany({});
      // Insert sample questions
      await Question.insertMany(sampleQuestions);
      console.log("Sample questions seeded successfully!");
    } catch (err) {
      console.error("Error seeding questions:", err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
