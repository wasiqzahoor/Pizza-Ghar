import mongoose from "mongoose";

const revokedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedToken =
  mongoose.models.RevokedToken || mongoose.model("RevokedToken", revokedTokenSchema);
