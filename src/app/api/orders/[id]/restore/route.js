export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* RESTORE DELETED ORDER (ADMIN) */
export async function POST(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);
    if (auth.user?.role !== "admin") return jsonError("Admin only", 403);

    const { id } = await params;
    const result = await Order.updateOne(
      { orderNo: Number(id) },
      { $set: { deletedAt: null } }
    );

    if (result.matchedCount === 0) return jsonError("Order not found", 404);

    return Response.json({ message: "Order restored" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
