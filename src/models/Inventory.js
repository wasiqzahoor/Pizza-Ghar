import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: null },
    stock: { type: Number, default: 0 },
    threshold: { type: Number, default: 0 },
    supplier: { type: String, default: null },
    initialStock: { type: Number, default: 0 },
    baselineStock: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const Inventory =
  mongoose.models.Inventory || mongoose.model("Inventory", inventorySchema);
