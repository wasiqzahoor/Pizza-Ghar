import mongoose from "mongoose";

const otpCodeSchema = new mongoose.Schema({
  otp: { type: String, required: true },
  purpose: { type: String, default: "register" },
  expiresAt: { type: Date, required: true },
});

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpCodeSchema.index({ otp: 1, created: -1 });
otpCodeSchema.add({ created: { type: Date, default: Date.now } });

export const OtpCode = mongoose.models.OtpCode || mongoose.model("OtpCode", otpCodeSchema);
