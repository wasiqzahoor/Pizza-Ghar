export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Recipe } from "@/models/Recipe";
import { Inventory } from "@/models/Inventory";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* GET RECIPES OF PRODUCT */
export async function GET(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const rows = await Recipe.find({
      product: mongoose.isValidObjectId(id) ? id : null,
    }).lean();

    const inventoryIds = [...new Set(rows.map((r) => String(r.inventory)))];
    const inventories = await Inventory.find({ _id: { $in: inventoryIds } })
      .select("name")
      .lean();
    const inventoryMap = new Map(inventories.map((i) => [String(i._id), i.name]));

    return Response.json(
      rows.map((r) => ({
        id: r._id,
        inventory_id: r.inventory,
        ingredient: inventoryMap.get(String(r.inventory)) || "",
        quantity: r.quantity,
      }))
    );
  } catch {
    return jsonError("Server error");
  }
}
