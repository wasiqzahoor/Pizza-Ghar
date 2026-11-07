export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Inventory } from "@/models/Inventory";
import { jsonError } from "@/lib/paging";
import {
  startOfDay,
  dayName,
  monthName,
  toDateKey,
  hourOfDay,
  zonedToUtc,
} from "@/lib/dates";

function rangeStart(range) {
  const now = new Date();
  const [y, m, d] = toDateKey(now).split("-").map(Number); // Karachi calendar today
  if (range === "week") {
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
    const back = wd === 0 ? 6 : wd - 1; // week starts Monday
    const mon = new Date(Date.UTC(y, m - 1, d) - back * 86400000);
    return zonedToUtc(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate());
  }
  if (range === "month") return zonedToUtc(y, m, 1);
  if (range === "year") return zonedToUtc(y, 1, 1);
  return startOfDay(now); // daily — Karachi start of today
}

export async function GET(req) {
  try {
    await connectDB();
    const range = new URL(req.url).searchParams.get("range");

    const start = rangeStart(range);
    const now = new Date();

    // chart uses the SAME window as the stat cards so they always agree
    const chartSince = start;

    // previous equivalent period (for real trend percentages)
    const [py, pm] = toDateKey(now).split("-").map(Number);
    const prevStart =
      range === "week"
        ? new Date(start.getTime() - 7 * 86400000)
        : range === "month"
          ? zonedToUtc(pm === 1 ? py - 1 : py, pm === 1 ? 12 : pm - 1, 1)
          : range === "year"
            ? zonedToUtc(py - 1, 1, 1)
            : new Date(start.getTime() - 86400000); // daily → yesterday
    const prevMatch = { deletedAt: null, created_at: { $gte: prevStart, $lt: start } };

    const [
      salesAgg,
      lowStockItems,
      newCustomersAgg,
      recentOrders,
      chartRows,
      prevSalesAgg,
      prevCustomersAgg,
    ] = await Promise.all([
        /* TOTAL SALES + TOTAL ORDERS in range */
        Order.aggregate([
          {
            $match: {
              deletedAt: null,
              created_at: { $gte: start, $lte: now },
            },
          },
          { $group: { _id: null, totalSales: { $sum: "$total" }, totalOrders: { $sum: 1 } } },
        ]),
        /* LOW STOCK */
        Inventory.countDocuments({
          $expr: { $lte: ["$stock", "$threshold"] },
        }),
        /* NEW CUSTOMERS (distinct names in range) */
        Order.aggregate([
          {
            $match: {
              deletedAt: null,
              created_at: { $gte: start, $lte: now },
              customerName: { $ne: null },
            },
          },
          { $group: { _id: "$customerName" } },
          { $count: "n" },
        ]),
        /* RECENT ORDERS */
        Order.find({ deletedAt: null })
          .sort({ orderNo: -1 })
          .limit(5)
          .select("customerName paymentMethod status")
          .lean(),
        /* CHART ROWS — same window as the cards */
        Order.find({
          deletedAt: null,
          created_at: { $gte: chartSince, $lte: now },
        })
          .select("total created_at")
          .lean(),
        /* PREVIOUS PERIOD SALES + ORDERS */
        Order.aggregate([
          { $match: prevMatch },
          { $group: { _id: null, totalSales: { $sum: "$total" }, totalOrders: { $sum: 1 } } },
        ]),
        /* PREVIOUS PERIOD NEW CUSTOMERS (distinct names) */
        Order.aggregate([
          {
            $match: {
              ...prevMatch,
              customerName: { $ne: null },
            },
          },
          { $group: { _id: "$customerName" } },
          { $count: "n" },
        ]),
      ]);

    const totalSales = salesAgg[0]?.totalSales || 0;
    const totalOrders = salesAgg[0]?.totalOrders || 0;
    const newCustomers = newCustomersAgg[0]?.n || 0;
    const prevSales = prevSalesAgg[0]?.totalSales || 0;
    const prevOrders = prevSalesAgg[0]?.totalOrders || 0;
    const prevCustomers = prevCustomersAgg[0]?.n || 0;

    /* real trend % vs previous equivalent period (null when no baseline) */
    const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
    const trends = {
      sales: pct(totalSales, prevSales),
      orders: pct(totalOrders, prevOrders),
      customers: pct(newCustomers, prevCustomers),
    };

    /* CHART DATA — full axis (zero-filled) so the graph is accurate */
    let chart = [];
    const [cy, cm] = toDateKey(now).split("-").map(Number);

    if (range === "week") {
      const labels = [];
      for (let i = 0; i < 7; i++) labels.push(dayName(new Date(start.getTime() + i * 86400000)));
      const byDay = new Map(labels.map((l) => [l, 0]));
      for (const r of chartRows) {
        const l = dayName(r.created_at);
        if (byDay.has(l)) byDay.set(l, byDay.get(l) + (r.total || 0));
      }
      chart = labels.map((l) => ({ label: l, total: byDay.get(l) }));
    } else if (range === "month") {
      const daysInMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
      const labels = [];
      for (let d = 1; d <= daysInMonth; d++) labels.push(toDateKey(zonedToUtc(cy, cm, d)));
      const byDate = new Map(labels.map((l) => [l, 0]));
      for (const r of chartRows) {
        const l = toDateKey(r.created_at);
        if (byDate.has(l)) byDate.set(l, byDate.get(l) + (r.total || 0));
      }
      chart = labels.map((l) => ({ label: l, total: byDate.get(l) }));
    } else if (range === "year") {
      const labels = [];
      for (let mo = 1; mo <= 12; mo++) labels.push(monthName(zonedToUtc(cy, mo, 1)));
      const byMonth = new Map(labels.map((l) => [l, 0]));
      for (const r of chartRows) {
        const l = monthName(r.created_at);
        if (byMonth.has(l)) byMonth.set(l, byMonth.get(l) + (r.total || 0));
      }
      chart = labels.map((l) => ({ label: l, total: byMonth.get(l) }));
    } else {
      // daily — today's hours (0..23) grouped by Karachi hour
      const byHour = new Map();
      for (let h = 0; h < 24; h++) byHour.set(h, 0);
      for (const r of chartRows) {
        const h = hourOfDay(r.created_at);
        byHour.set(h, (byHour.get(h) || 0) + (r.total || 0));
      }
      chart = [...byHour.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([label, total]) => ({ label, total }));
    }

    return Response.json({
      totalSales,
      totalOrders,
      lowStockItems,
      newCustomers,
      trends,
      recentOrders: recentOrders.map((r) => ({
        customer_name: r.customerName,
        payment_method: r.paymentMethod,
        status: r.status,
      })),
      chart,
    });
  } catch (error) {
    console.log(error);
    return jsonError("Dashboard error");
  }
}
