export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* Mark items as printed AFTER a successful bill print.
   Called only by the client once the print job actually launched —
   if printing fails, this endpoint is never called and items stay pending.

   body: { all: true }                         → mark every unprinted item
   body: { lines: [{ index, name, price, qty }] } → mark exactly those lines
        (each line is re-validated against the stored item so stale/shifted
         indexes can never mark the wrong item) */
export async function POST(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const order = await Order.findOne({ orderNo: Number(id) });
    if (!order) return jsonError("Order not found", 404);

    let marked = 0;

    if (Array.isArray(body.lines)) {
      for (const l of body.lines) {
        const idx = Number(l?.index);
        if (!Number.isInteger(idx) || idx < 0) continue;
        const it = order.items[idx];
        if (!it || it.printed) continue;
        if (
          it.name !== l.name ||
          Number(it.price) !== Number(l.price) ||
          Number(it.qty) !== Number(l.qty)
        ) {
          continue; /* line changed since fetch — do not mark blindly */
        }
        it.printed = true;
        marked++;
      }
    } else {
      for (const it of order.items) {
        if (!it.printed) {
          it.printed = true;
          marked++;
        }
      }
    }

    if (marked > 0) await order.save();

    return Response.json({ message: "Print status updated", marked });
  } catch (err) {
    console.error(err);
    return jsonError("Update failed");
  }
}
