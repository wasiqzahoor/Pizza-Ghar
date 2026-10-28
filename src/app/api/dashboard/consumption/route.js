export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Inventory } from "@/models/Inventory";
import { jsonError } from "@/lib/paging";
import { startOfDay } from "@/lib/dates";

/* INVENTORY CONSUMPTION for given range */
export async function GET(req) {
  try {
    await connectDB();
    const range = new URL(req.url).searchParams.get("range") || "daily";

    const now = new Date();
    let since = startOfDay(now);

    if (range === "week") {
      const d = new Date();
      const dayOfWeek = d.getDay(); // 0=Sun
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // week starts Monday
      since = new Date(d.getTime() - diff * 24 * 3600 * 1000);
      since = startOfDay(since);
    } else if (range === "month") {
      since = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (range === "year") {
      since = startOfDay(new Date(now.getFullYear(), 0, 1));
    }

    const rows = await Inventory.find({
      $or: [{ updated_at: { $gte: since } }, { updated_at: null }],
    })
      .select("name stock baselineStock")
      .lean();

    return Response.json(
      rows.map((r) => {
        const baseline = r.baselineStock || 0;
        const used = baseline - (r.stock || 0);
        return {
          id: r._id,
          name: r.name,
          current_stock: r.stock,
          baseline_stock: baseline,
          used_stock: used,
          consumption_percentage:
            baseline > 0 ? Math.round((used / baseline) * 100 * 100) / 100 : 0,
        };
      })
    );
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}
