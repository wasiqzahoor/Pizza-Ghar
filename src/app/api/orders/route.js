export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Recipe } from "@/models/Recipe";
import { Inventory } from "@/models/Inventory";
import { nextSeq } from "@/models/Counter";
import { requireAuth } from "@/lib/auth";
import { getPaging, isValidDate, jsonError } from "@/lib/paging";
import { dayRange } from "@/lib/dates";

/* SAVE ORDER WITH INVENTORY CHECK (transaction) */
export async function POST(req) {
  await connectDB();
  const auth = await requireAuth(req);
  if (auth.error) return jsonError(auth.error, auth.status);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const {
      customerName,
      orderType,
      paymentMethod,
      billStatus,
      subtotal,
      total,
      items,
      cashReceived,
      cashBack,
      dueAmount,
      customerPhone,
      address,
      orderDescription,
    } = body;

    /* 1. CHECK INVENTORY BEFORE ORDER */
    const productIds = items.map((i) => i.id);
    const recipes = await Recipe.find({ product: { $in: productIds } }).session(session);

    const inventoryIds = [...new Set(recipes.map((r) => String(r.inventory)))];
    const inventoryRows = await Inventory.find({
      _id: { $in: inventoryIds },
    }).session(session);
    const invMap = new Map(inventoryRows.map((i) => [String(i._id), i]));

    for (const item of items) {
      const itemRecipes = recipes.filter((r) => String(r.product) === String(item.id));
      for (const r of itemRecipes) {
        const inv = invMap.get(String(r.inventory));
        if (!inv) continue;
        const required = r.quantity * item.qty;
        if ((inv.stock || 0) < required) {
          await session.abortTransaction();
          return jsonError(`Not enough ${inv.name} in inventory`, 400);
        }
      }
    }

    /* 2. CREATE ORDER */
    const orderNo = await nextSeq("order");

    const orderItems = items.map((item) => ({
      productId: mongoose.isValidObjectId(item.id) ? item.id : null,
      legacyProductId: null,
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
      total: Number(item.price) * Number(item.qty),
    }));

    const [order] = await Order.create(
      [
        {
          orderNo,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          deliveryAddress: address || null,
          orderDescription: orderDescription || null,
          orderType,
          paymentMethod,
          billStatus,
          subtotal: Number(subtotal) || 0,
          total: Number(total) || 0,
          cashReceived: Number(cashReceived) || 0,
          cashBack: Number(cashBack) || 0,
          dueAmount: Number(dueAmount) || 0,
          status: "preparing",
          items: orderItems,
        },
      ],
      { session }
    );

    /* 3. DEDUCT INVENTORY */
    for (const item of items) {
      const itemRecipes = recipes.filter((r) => String(r.product) === String(item.id));
      for (const r of itemRecipes) {
        const inv = invMap.get(String(r.inventory));
        if (!inv) continue;
        const deduction = r.quantity * item.qty;
        await Inventory.updateOne(
          { _id: r.inventory },
          { $inc: { stock: -deduction } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    return Response.json({ message: "Order saved successfully", orderId: orderNo });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return jsonError("Server error");
  } finally {
    session.endSession();
  }
}

/* GET ALL ORDERS (ORDERS PAGE) */
export async function GET(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const sp = new URL(req.url).searchParams;
    const { page, limit, offset, q } = getPaging(sp, { def: 20, max: 100 });

    const wantDeleted = sp.get("deleted") === "1" || sp.get("deleted") === "true";

    const filter = {};
    const and = [];

    if (wantDeleted) {
      if (auth.user?.role !== "admin") return jsonError("Admin only", 403);
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
    }

    if (q) {
      const like = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const or = [
        { customerName: { $regex: like, $options: "i" } },
        { customerPhone: { $regex: like, $options: "i" } },
      ];
      if (/^\d+$/.test(q)) or.push({ orderNo: Number(q) });
      and.push({ $or: or });
    }

    const status = (sp.get("status") || "").trim();
    if (status && status !== "all") {
      if (status === "completed") {
        and.push({ $or: [{ status: "completed" }, { status: null }] });
      } else {
        filter.status = status;
      }
    }
    if (and.length) filter.$and = and;

    const billStatus = (sp.get("billStatus") || "").trim();
    if (billStatus && billStatus !== "all") filter.billStatus = billStatus;

    const from = (sp.get("from") || "").trim();
    const to = (sp.get("to") || "").trim();
    if (isValidDate(from) || isValidDate(to)) {
      filter.created_at = {};
      if (isValidDate(from)) filter.created_at.$gte = dayRange(from)[0];
      if (isValidDate(to)) filter.created_at.$lt = dayRange(to)[1];
    }

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ orderNo: -1 })
        .skip(offset)
        .limit(limit)
        .select(
          "orderNo customerName customerPhone deliveryAddress orderDescription orderType paymentMethod billStatus subtotal total cashReceived cashBack dueAmount status created_at deletedAt items"
        )
        .lean(),
    ]);

    return Response.json({
      rows: orders.map((o) => ({
        id: o.orderNo,
        customer_name: o.customerName,
        customer_phone: o.customerPhone,
        delivery_address: o.deliveryAddress,
        order_description: o.orderDescription,
        order_type: o.orderType,
        payment_method: o.paymentMethod,
        bill_status: o.billStatus,
        subtotal: o.subtotal,
        total: o.total,
        cash_received: o.cashReceived,
        cash_back: o.cashBack,
        due_amount: o.dueAmount,
        status: o.status,
        created_at: o.created_at,
        deleted_at: o.deletedAt,
        items: o.items?.length || 0,
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
