export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* CLAIM KITCHEN RECEIPT PRINT (once per order version).
   First print allowed; returns 409 if already printed.
   Order edit (PUT /:id) clears kitchenPrintedAt. */
export async function POST(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;

    const result = await Order.updateOne(
      { orderNo: Number(id), kitchenPrintedAt: null, deletedAt: null },
      { $set: { kitchenPrintedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      const exists = await Order.findOne({ orderNo: Number(id) }).select("_id").lean();
      if (!exists) return jsonError("Order not found", 404);
      return jsonError("Kitchen receipt already printed for this order", 409);
    }

    return Response.json({ message: "Kitchen receipt print allowed" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
