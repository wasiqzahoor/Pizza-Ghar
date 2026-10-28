export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function GET(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);

    const filter = {};
    if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const rows = await Product.find(filter)
      .sort({ name: 1 })
      .limit(1000)
      .select("name")
      .lean();

    return Response.json(
      rows.map((r) => ({
        id: r._id,
        name: r.name,
      }))
    );
  } catch {
    return jsonError("Server error");
  }
}
