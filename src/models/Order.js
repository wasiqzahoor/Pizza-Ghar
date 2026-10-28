import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    legacyProductId: { type: Number, default: null },
    name: { type: String, default: "" },
    price: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: Number, required: true, unique: true },
    customerName: { type: String, default: null },
    customerPhone: { type: String, default: null },
    deliveryAddress: { type: String, default: null },
    orderDescription: { type: String, default: null },
    orderType: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    billStatus: { type: String, default: "paid" },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    cashBack: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    status: { type: String, default: "preparing" },
    kitchenPrintedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    items: { type: [orderItemSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

orderSchema.index({ created_at: -1 });
orderSchema.index({ status: 1, created_at: -1 });
orderSchema.index({ billStatus: 1 });
orderSchema.index({ deletedAt: 1 });
orderSchema.index({ customerName: 1 });
orderSchema.index({ customerPhone: 1 });

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
