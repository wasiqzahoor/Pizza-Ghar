import mongoose from "mongoose";

const dailyNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const DailyNote =
  mongoose.models.DailyNote || mongoose.model("DailyNote", dailyNoteSchema);
