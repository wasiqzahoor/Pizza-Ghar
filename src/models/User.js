import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    email: { type: String, default: null, unique: true, sparse: true },
    password: { type: String, default: null },
    role: {
      type: String,
      enum: ["admin", "cashier", "chef"],
      default: "cashier",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
