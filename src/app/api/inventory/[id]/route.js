export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Inventory } from "@/models/Inventory";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const { name, category, stock, threshold, supplier } = await req.json();

    await Inventory.updateOne(
      { _id: id },
      {
        $set: {
          name,
          category,
          stock: Number(stock) || 0,
          threshold: Number(threshold) || 0,
          supplier,
          baselineStock: Number(stock) || 0, // RESET consumption baseline
        },
      }
    );

    return Response.json({ message: "Item updated and consumption reset" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    await Inventory.deleteOne({ _id: id });

    return Response.json({ message: "Item deleted" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
