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
    const { billStatus, dueAmount } = await req.json();

    await Order.updateOne(
      { orderNo: Number(id) },
      { $set: { billStatus, dueAmount: dueAmount || 0 } }
    );

    return Response.json({ message: "Bill status updated" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
