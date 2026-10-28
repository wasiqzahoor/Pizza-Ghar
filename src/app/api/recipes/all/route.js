export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Recipe } from "@/models/Recipe";
import { Product } from "@/models/Product";
import { Inventory } from "@/models/Inventory";
import { requireAuth } from "@/lib/auth";
import { getPaging, jsonError } from "@/lib/paging";

/* GET ALL RECIPES (paginated, joined) */
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
    if (q) {
      const like = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const [products, inventories] = await Promise.all([
        Product.find({ name: { $regex: like, $options: "i" } }).select("_id").lean(),
        Inventory.find({ name: { $regex: like, $options: "i" } }).select("_id").lean(),
      ]);
      filter.$or = [
        { product: { $in: products.map((p) => p._id) } },
        { inventory: { $in: inventories.map((i) => i._id) } },
      ];
    }

    const total = await Recipe.countDocuments(filter);
    const rows = await Recipe.find(filter)
      .sort({ _id: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const productIds = [...new Set(rows.map((r) => String(r.product)))];
    const inventoryIds = [...new Set(rows.map((r) => String(r.inventory)))];

    const [products, inventories] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).select("name").lean(),
      Inventory.find({ _id: { $in: inventoryIds } }).select("name").lean(),
    ]);

    const productMap = new Map(products.map((p) => [String(p._id), p.name]));
    const inventoryMap = new Map(inventories.map((i) => [String(i._id), i.name]));

    return Response.json({
      rows: rows
        .map((r) => ({
          id: r._id,
          product: productMap.get(String(r.product)) || "",
          ingredient: inventoryMap.get(String(r.inventory)) || "",
          quantity: r.quantity,
        }))
        .sort((a, b) => a.product.localeCompare(b.product)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}
