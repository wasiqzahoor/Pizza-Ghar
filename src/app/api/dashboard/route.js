export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Inventory } from "@/models/Inventory";
import { jsonError } from "@/lib/paging";
import {
  startOfDay,
  endOfDay,
  dayName,
  monthName,
  toDateKey,
  hourOfDay,
} from "@/lib/dates";

function rangeStart(range) {
  const now = new Date();
  if (range === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // week starts Monday
    return startOfDay(new Date(now.getTime() - diff * 24 * 3600 * 1000));
  }
  if (range === "month") return startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  if (range === "year") return startOfDay(new Date(now.getFullYear(), 0, 1));
  return startOfDay(now); // daily
}

export async function GET(req) {
  try {
    await connectDB();
    const range = new URL(req.url).searchParams.get("range");

    const start = rangeStart(range);
    const now = new Date();

    /* TOTAL SALES + TOTAL ORDERS in range */
    const [salesAgg] = await Order.aggregate([
      {
        $match: {
          deletedAt: null,
          created_at: { $gte: start, $lte: now },
        },
      },
      { $group: { _id: null, totalSales: { $sum: "$total" }, totalOrders: { $sum: 1 } } },
    ]);
    const totalSales = salesAgg?.totalSales || 0;
    const totalOrders = salesAgg?.totalOrders || 0;

    /* LOW STOCK */
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ["$stock", "$threshold"] },
    });

    /* NEW CUSTOMERS (today, distinct names) */
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const newCustomersAgg = await Order.aggregate([
      {
        $match: {
          deletedAt: null,
          created_at: { $gte: todayStart, $lt: todayEnd },
          customerName: { $ne: null },
        },
      },
      { $group: { _id: "$customerName" } },
      { $count: "n" },
    ]);
    const newCustomers = newCustomersAgg[0]?.n || 0;

    /* RECENT ORDERS */
    const recentOrders = await Order.find({ deletedAt: null })
      .sort({ orderNo: -1 })
      .limit(5)
      .select("customerName paymentMethod status")
      .lean();

    /* CHART DATA */
    let chart = [];

    if (range === "week") {
      // group by day name over current week (since = Monday start)
      const rows = await Order.find({
        deletedAt: null,
        created_at: { $gte: start },
      })
        .select("total created_at")
        .lean();

      const byDay = new Map();
      for (const r of rows) {
        const label = dayName(r.created_at);
        byDay.set(label, (byDay.get(label) || 0) + (r.total || 0));
      }
      chart = [...byDay.entries()].map(([label, total]) => ({ label, total }));
    } else if (range === "month") {
      const rows = await Order.find({
        deletedAt: null,
        created_at: { $gte: start },
      })
        .select("total created_at")
        .lean();

      const byDate = new Map();
      for (const r of rows) {
        const label = toDateKey(r.created_at);
        byDate.set(label, (byDate.get(label) || 0) + (r.total || 0));
      }
      chart = [...byDate.entries()].sort().map(([label, total]) => ({ label, total }));
    } else if (range === "year") {
      const rows = await Order.find({
        deletedAt: null,
        created_at: { $gte: start },
      })
        .select("total created_at")
        .lean();

      const byMonth = new Map();
      for (const r of rows) {
        const label = monthName(r.created_at);
        byMonth.set(label, (byMonth.get(label) || 0) + (r.total || 0));
      }
      chart = [...byMonth.entries()].map(([label, total]) => ({ label, total }));
    } else {
      // daily — last 24 hours grouped by hour
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const rows = await Order.find({
        deletedAt: null,
        created_at: { $gte: since },
      })
        .select("total created_at")
        .lean();

      const byHour = new Map();
      for (let h = 0; h < 24; h++) byHour.set(h, 0);
      for (const r of rows) {
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
