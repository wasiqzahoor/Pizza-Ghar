import mongoose from "mongoose";

const adminSettingSchema = new mongoose.Schema({
  name: { type: String, default: "Admin" },
  title: { type: String, default: "Administrator" },
  autoDualPrint: { type: Boolean, default: false },
  billPrinter: { type: String, default: "Black Copper" },
  kitchenPrinter: { type: String, default: "POS 80X" },
});

export const AdminSetting =
  mongoose.models.AdminSetting || mongoose.model("AdminSetting", adminSettingSchema);
