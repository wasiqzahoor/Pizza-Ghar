export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";
import { formatKitchenDate, formatKitchenTime } from "@/lib/dates";

/* GET KITCHEN ORDERS */
export async function GET(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const since = new Date(Date.now() - 24 * 3600 * 1000);

    const orders = await Order.find({
      $and: [
        { $or: [{ status: { $ne: "completed" } }, { status: null }] },
        { deletedAt: null },
        { created_at: { $gte: since } },
      ],
    })
      .sort({ orderNo: -1 })
      .limit(100)
      .select("orderNo customerName orderType status created_at items")
      .lean();

    return Response.json(
      orders.map((o) => ({
        id: o.orderNo,
        customer: o.customerName,
        type: o.orderType,
        status: o.status || "preparing",
        date: formatKitchenDate(o.created_at),
        time: formatKitchenTime(o.created_at),
        items: (o.items || []).map((it) => ({ name: it.name, qty: it.qty })),
      }))
    );
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
