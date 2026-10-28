import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: null },
    image: { type: String, default: null },
    legacyId: { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

productSchema.index({ category: 1 });

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
