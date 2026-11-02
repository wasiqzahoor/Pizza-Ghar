export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* ADD-ON / MODIFY ORDER — merges the cart into the existing order under the
   SAME orderNo. Per-item printed status is preserved:
   - untouched printed lines keep printed=true (never reprinted)
   - qty increase on a printed line splits into printed part + unprinted delta
   - brand-new lines are unprinted add-ons
   Returns the currently-unprinted lines so the client can print ONLY those. */
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
      items = [],
      cashReceived = 0,
    } = body;

    const order = await Order.findOne({ orderNo: Number(id) });
    if (!order) return jsonError("Order not found", 404);

    const existing = order.items || [];
    const incoming = [...items];
    const used = new Set();
    const merged = [];

    /* Match stored lines against cart lines (name + price) */
    for (const s of existing) {
      const idx = incoming.findIndex(
        (i, k) =>
          !used.has(k) &&
          i.name === s.name &&
          Number(i.price) === Number(s.price)
      );
      if (idx === -1) continue; /* removed from cart → honor removal */
      used.add(idx);

      const inc = incoming[idx];
      const newQty = Number(inc.qty) || 0;
      const oldQty = Number(s.qty) || 0;
      const price = Number(s.price) || 0;
      const wasPrinted = !!s.printed;
      if (newQty <= 0) continue;

      const base = {
        productId: s.productId ?? null,
        legacyProductId: s.legacyProductId ?? null,
        name: s.name,
        price,
      };

      if (wasPrinted && newQty > oldQty) {
        /* split: original printed units stay printed, extra units = add-on */
        merged.push({ ...base, qty: oldQty, total: price * oldQty, printed: true });
        merged.push({
          ...base,
          qty: newQty - oldQty,
          total: price * (newQty - oldQty),
          printed: false,
        });
      } else {
        merged.push({ ...base, qty: newQty, total: price * newQty, printed: wasPrinted });
      }
    }

    /* Unmatched cart lines = brand-new add-ons (pending print) */
    incoming.forEach((i, k) => {
      if (used.has(k)) return;
      const price = Number(i.price) || 0;
      const qty = Number(i.qty) || 0;
      if (qty <= 0) return;
      merged.push({
        productId: i.id && mongoose.isValidObjectId(i.id) ? i.id : null,
        legacyProductId: null,
        name: i.name,
        price,
        qty,
        total: price * qty,
        printed: false,
      });
    });

    const subtotal = merged.reduce((a, b) => a + b.total, 0);
    const total = subtotal;
    const cash = Number(cashReceived) || 0;
    const dueAmount = Math.max(total - cash, 0);
    const cashBack = cash > total ? cash - total : 0;

    order.customerName = customerName || null;
    order.customerPhone = customerPhone || null;
    order.deliveryAddress = address || null;
    order.orderDescription = orderDescription || null;
    order.orderType = orderType;
    order.paymentMethod = paymentMethod;
    order.billStatus = billStatus;
    order.subtotal = subtotal;
    order.total = total;
    order.cashReceived = cash;
    order.cashBack = cashBack;
    order.dueAmount = dueAmount;
    order.kitchenPrintedAt = null;
    order.items = merged;

    await order.save();

    const unprinted = merged
      .map((it, i) => ({
        line: i,
        name: it.name,
        price: it.price,
        qty: it.qty,
        total: it.total,
      }))
      .filter((_, i) => !merged[i].printed);

    return Response.json({
      message: "Order updated successfully",
      unprinted,
      items: merged.map((it, i) => ({ ...it, line: i, printed: !!it.printed })),
    });
  } catch (err) {
    console.error(err);
    return jsonError("Update failed");
  }
}
