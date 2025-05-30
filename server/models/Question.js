import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Ancient History of Punjab",
      "Sikh Gurus",
      "Banda Singh Bahadur and Sikh Misls",
      "Era of Maharaja Ranjit Singh",
      "British Rule and Freedom Struggle in Punjab",
      "Post-Independence Punjab",
      "Punjab's Geography, Culture and Heritage - Historical Context",
    ],
  },
});

const Question = mongoose.model("Question", questionSchema);

export default Question;
