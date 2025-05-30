import mongoose from "mongoose";

const UserSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  sessionStartTime: {
    type: Date,
    required: true,
  },
});

export default mongoose.model("UserSession", UserSessionSchema);
