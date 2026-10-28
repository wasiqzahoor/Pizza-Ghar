export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* GET SINGLE ORDER */
export async function GET(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const order = await Order.findOne({ orderNo: Number(id) }).lean();
    if (!order) return jsonError("Order not found", 404);

    return Response.json({
      id: order.orderNo,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.deliveryAddress,
      orderDescription: order.orderDescription,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      billStatus: order.billStatus,
      subtotal: order.subtotal,
      total: order.total,
      cashReceived: order.cashReceived,
      cashBack: order.cashBack,
      dueAmount: order.dueAmount,
      status: order.status,
      created_at: order.created_at || null,
      items: (order.items || []).map((it) => ({
        name: it.name,
        price: it.price,
        qty: it.qty,
        total: it.total,
      })),
    });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}

/* MODIFY ORDER */
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      address,
      orderDescription,
      orderType,
      paymentMethod,
      billStatus,
      items,
      subtotal,
      total,
      cashReceived = 0,
    } = body;

    const dueAmount = Math.max(Number(total) - Number(cashReceived), 0);
    const cashBack =
      Number(cashReceived) > Number(total) ? Number(cashReceived) - Number(total) : 0;

    const order = await Order.findOne({ orderNo: Number(id) });
    if (!order) return jsonError("Order not found", 404);

    order.customerName = customerName || null;
    order.customerPhone = customerPhone || null;
    order.deliveryAddress = address || null;
    order.orderDescription = orderDescription || null;
    order.orderType = orderType;
    order.paymentMethod = paymentMethod;
    order.billStatus = billStatus;
    order.subtotal = Number(subtotal) || 0;
    order.total = Number(total) || 0;
    order.cashReceived = Number(cashReceived) || 0;
    order.cashBack = cashBack;
    order.dueAmount = dueAmount;
    order.kitchenPrintedAt = null;

    order.items = (items || []).map((item) => ({
      productId:
        item.id && typeof item.id === "string" && item.id.length === 24
          ? item.id
          : null,
      legacyProductId: null,
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
      total: Number(item.price) * Number(item.qty),
    }));

    await order.save();

    return Response.json({ message: "Order updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonError("Update failed");
  }
}

/* DELETE ORDER (soft) */
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    await Order.updateOne({ orderNo: Number(id) }, { $set: { deletedAt: new Date() } });

    return Response.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.log(error);
    return jsonError("Delete failed");
  }
}
