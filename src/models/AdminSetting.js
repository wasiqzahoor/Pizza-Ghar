import mongoose from "mongoose";

const adminSettingSchema = new mongoose.Schema({
  name: { type: String, default: "Admin" },
  title: { type: String, default: "Administrator" },
});

export const AdminSetting =
  mongoose.models.AdminSetting || mongoose.model("AdminSetting", adminSettingSchema);
