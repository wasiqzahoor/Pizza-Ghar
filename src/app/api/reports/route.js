export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { jsonError, isValidDate } from "@/lib/paging";
import { startOfDay, endOfDay, dayRange, dayName, monthName, toDateKey, hourOfDay, monthOfYear } from "@/lib/dates";

/* GET REPORT DATA */
export async function GET(req) {
  try {
    await connectDB();
    const sp = new URL(req.url).searchParams;
    const range = sp.get("range") || "week";
    const start = sp.get("start");
    const end = sp.get("end");

    const now = new Date();
    let since;
    let until = now;
    let groupBy; // function(date) => label

    if (range === "custom" && isValidDate(start) && isValidDate(end)) {
      since = dayRange(start)[0];
      until = dayRange(end)[1];
      groupBy = (d) => toDateKey(d);
    } else if (range === "day") {
      since = startOfDay(now);
      until = endOfDay(now);
      groupBy = (d) => `${hourOfDay(d)}:00`;
    } else if (range === "month") {
      since = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      until = endOfDay(now);
      groupBy = (d) => toDateKey(d);
    } else if (range === "year") {
      since = startOfDay(new Date(now.getFullYear(), 0, 1));
      until = endOfDay(now);
      groupBy = (d) => monthName(d);
    } else {
      // week (default) — current calendar week, starts Monday
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      since = startOfDay(new Date(now.getTime() - diff * 24 * 3600 * 1000));
      until = endOfDay(now);
      groupBy = (d) => dayName(d);
    }

    const match = { deletedAt: null, created_at: { $gte: since, $lte: until } };

    const [orders, topAgg] = await Promise.all([
      Order.find(match).select("total created_at").lean(),
      Order.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            qty: { $sum: "$items.qty" },
            total: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    /* CHART */
    const chartMap = new Map();
    let totalRevenue = 0;
    for (const o of orders) {
      totalRevenue += o.total || 0;
      const label = groupBy(o.created_at);
      if (!chartMap.has(label)) chartMap.set(label, { name: label, revenue: 0, first: o.created_at });
      chartMap.get(label).revenue += o.total || 0;
    }
    const chart = [...chartMap.values()]
      .sort((a, b) => a.first - b.first)
      .map(({ name, revenue }) => ({ name, revenue }));

    const totalOrders = orders.length;
    const avgOrderValue = Math.round(totalRevenue / (totalOrders || 1));

    /* TOP ITEMS */
    const topItems = topAgg.map((t) => ({ id: t._id, name: t._id, qty: t.qty, total: t.total }));

    return Response.json({
      chart,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      topItems,
    });
  } catch (error) {
    console.log("Reports Error:", error);
    return jsonError("Reports server error");
  }
}
