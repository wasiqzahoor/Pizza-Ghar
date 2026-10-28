export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Inventory } from "@/models/Inventory";
import { requireAuth } from "@/lib/auth";
import { getPaging, jsonError } from "@/lib/paging";

export async function GET(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { page, limit, offset, q } = getPaging(new URL(req.url).searchParams, {
      def: 20,
      max: 100,
    });

    const filter = {};
    if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const total = await Inventory.countDocuments(filter);
    const rows = await Inventory.find(filter)
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    return Response.json({
      rows: rows.map((r) => ({
        id: r._id,
        name: r.name,
        category: r.category,
        stock: r.stock,
        threshold: r.threshold,
        supplier: r.supplier,
        initial_stock: r.initialStock,
        baseline_stock: r.baselineStock,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { name, category, stock, threshold, supplier } = await req.json();

    if (!name) return jsonError("Name required", 400);

    const created = await Inventory.create({
      name,
      category,
      stock: Number(stock) || 0,
      threshold: Number(threshold) || 0,
      supplier,
      initialStock: Number(stock) || 0,
      baselineStock: Number(stock) || 0,
    });

    return Response.json({ message: "Item added", id: created._id });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
