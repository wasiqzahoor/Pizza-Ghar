export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    await Order.updateOne({ orderNo: Number(id) }, { $set: { status: "completed" } });

    return Response.json({ message: "Order completed" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
