import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
    index: true,
  },
  quantity: { type: Number, default: 0 },
  legacyId: { type: Number, default: null },
});

export const Recipe = mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema);
