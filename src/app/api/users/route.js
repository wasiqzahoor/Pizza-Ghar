export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/auth";
import { getPaging, jsonError } from "@/lib/paging";

export async function GET(req) {
  try {
    await connectDB();
    const auth = await requireAdmin(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { page, limit, offset, q } = getPaging(new URL(req.url).searchParams, {
      def: 20,
      max: 100,
    });

    const filter = {};
    if (q) filter.email = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const total = await User.countDocuments(filter);
    const rows = await User.find(filter)
      .sort({ _id: 1 })
      .skip(offset)
      .limit(limit)
      .select("email role")
      .lean();

    return Response.json({
      rows: rows.map((r) => ({
        id: r._id,
        email: r.email,
        role: r.role,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch {
    return jsonError("Server error");
  }
}
