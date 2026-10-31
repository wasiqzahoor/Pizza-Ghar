import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    seq: { type: Number },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
