import mongoose from "mongoose";

const adminSettingSchema = new mongoose.Schema({
  name: { type: String, default: "Admin" },
  title: { type: String, default: "Administrator" },
  autoDualPrint: { type: Boolean, default: false },
  billPrinter: { type: String, default: "" },
  kitchenPrinter: { type: String, default: "" },
});

export const AdminSetting =
  mongoose.models.AdminSetting || mongoose.model("AdminSetting", adminSettingSchema);
