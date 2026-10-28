/* One-time migration: MySQL (pizzagha_pos_db) → MongoDB (restaurant_pos).
   Run: node --env-file=.env.local --env-file="E:/Restaurant System/routes/.env" scripts/migrate.js */

import mysql from "mysql2/promise";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/mongodb.js";
import { User } from "../src/models/User.js";
import { Category } from "../src/models/Category.js";
import { Product } from "../src/models/Product.js";
import { Inventory } from "../src/models/Inventory.js";
import { Recipe } from "../src/models/Recipe.js";
import { Order } from "../src/models/Order.js";
import { AdminSetting } from "../src/models/AdminSetting.js";
import { DailyNote } from "../src/models/DailyNote.js";
import { Counter } from "../src/models/Counter.js";

const log = (...a) => console.log("[migrate]", ...a);

async function main() {
  /* ---------- connect MySQL ---------- */
  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 10,
  });
  log("MySQL connected:", process.env.DB_NAME);

  /* ---------- connect MongoDB ---------- */
  await connectDB();
  log("MongoDB connected:", mongoose.connection.db.databaseName);

  /* ---------- wipe target collections ---------- */
  const collections = ["users", "categories", "products", "inventorys", "recipes", "orders", "adminsettings", "dailynotes", "counters"];
  for (const c of collections) {
    await mongoose.connection.collection(c).deleteMany({});
  }
  log("Target collections cleared");

  /* ---------- users ---------- */
  const [users] = await mysqlConn.query("SELECT * FROM users");
  const userIdMap = new Map();
  const userDocs = users.map((u) => {
    const doc = {
      name: u.name ?? null,
      email: u.email ?? null,
      password: u.password ?? null,
      role: u.role ?? "cashier",
    };
    return { legacy: u.id, doc };
  });
  for (const { legacy, doc } of userDocs) {
    const created = await User.create(doc);
    userIdMap.set(legacy, created._id);
  }
  log("users:", users.length);

  /* ---------- categories ---------- */
  const [categories] = await mysqlConn.query("SELECT * FROM categories");
  const catDocs = categories.map((c) => ({ name: c.name }));
  await Category.insertMany(catDocs);
  log("categories:", categories.length);

  /* ---------- products ---------- */
  const [products] = await mysqlConn.query("SELECT * FROM products");
  const productIdMap = new Map();
  const productDocs = products.map((p) => ({
    name: p.name,
    price: Number(p.price) || 0,
    category: p.category ?? null,
    image: p.image ?? null,
    legacyId: p.id,
    created_at: p.created_at ? new Date(p.created_at) : new Date(),
  }));
  const createdProducts = await Product.insertMany(productDocs);
  products.forEach((p, i) => productIdMap.set(p.id, createdProducts[i]._id));
  log("products:", products.length);

  /* ---------- inventory ---------- */
  const [inventory] = await mysqlConn.query("SELECT * FROM inventory");
  const invIdMap = new Map();
  const invDocs = inventory.map((i) => ({
    name: i.name,
    category: i.category ?? null,
    stock: i.stock ?? 0,
    threshold: i.threshold ?? 0,
    supplier: i.supplier ?? null,
    initialStock: i.initial_stock ?? 0,
    baselineStock: i.baseline_stock ?? 0,
    created_at: i.created_at ? new Date(i.created_at) : new Date(),
    updated_at: i.updated_at ? new Date(i.updated_at) : new Date(),
  }));
  const createdInv = await Inventory.insertMany(invDocs);
  inventory.forEach((i, idx) => invIdMap.set(i.id, createdInv[idx]._id));
  log("inventory:", inventory.length);

  /* ---------- product_recipes ---------- */
  const [recipes] = await mysqlConn.query("SELECT * FROM product_recipes");
  let skippedRecipes = 0;
  const recipeDocs = [];
  for (const r of recipes) {
    const productObjectId = productIdMap.get(r.product_id);
    const inventoryObjectId = invIdMap.get(r.inventory_id);
    if (!productObjectId || !inventoryObjectId) {
      skippedRecipes++;
      continue;
    }
    recipeDocs.push({
      product: productObjectId,
      inventory: inventoryObjectId,
      quantity: r.quantity ?? 0,
      legacyId: r.id,
    });
  }
  await Recipe.insertMany(recipeDocs);
  log("recipes:", recipeDocs.length, `(skipped ${skippedRecipes} orphans)`);

  /* ---------- orders + order_items ---------- */
  const [orders] = await mysqlConn.query("SELECT * FROM orders ORDER BY id ASC");
  log("fetched orders:", orders.length);

  const [allItems] = await mysqlConn.query(
    "SELECT * FROM order_items ORDER BY order_id ASC, id ASC"
  );
  const itemsByOrder = new Map();
  for (const it of allItems) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push(it);
  }
  log("fetched order_items:", allItems.length);

  const orderDocs = orders.map((o) => ({
    orderNo: o.id,
    customerName: o.customer_name ?? null,
    customerPhone: o.customer_phone ?? null,
    deliveryAddress: o.delivery_address ?? null,
    orderDescription: o.order_description ?? null,
    orderType: o.order_type ?? null,
    paymentMethod: o.payment_method ?? null,
    billStatus: o.bill_status ?? "paid",
    subtotal: Number(o.subtotal) || 0,
    tax: Number(o.tax) || 0,
    total: Number(o.total) || 0,
    cashReceived: Number(o.cash_received) || 0,
    cashBack: Number(o.cash_back) || 0,
    dueAmount: Number(o.due_amount) || 0,
    status: o.status ?? null,
    kitchenPrintedAt: o.kitchen_printed_at ? new Date(o.kitchen_printed_at) : null,
    deletedAt: o.deleted_at ? new Date(o.deleted_at) : null,
    created_at: o.created_at ? new Date(o.created_at) : new Date(),
    items: (itemsByOrder.get(o.id) || []).map((it) => ({
      productId: productIdMap.get(it.product_id) || null,
      legacyProductId: it.product_id ?? null,
      name: it.product_name ?? "",
      price: Number(it.price) || 0,
      qty: it.qty ?? 0,
      total: Number(it.total) || 0,
    })),
  }));

  await Order.insertMany(orderDocs, { ordered: false });
  log("orders inserted:", orderDocs.length);

  /* ---------- counters ---------- */
  const maxOrderNo = orders.length ? Math.max(...orders.map((o) => o.id)) : 0;
  await Counter.create({ key: "order", seq: maxOrderNo });
  log("order counter set to:", maxOrderNo);

  /* ---------- admin_settings ---------- */
  const [settings] = await mysqlConn.query("SELECT * FROM admin_settings LIMIT 1");
  if (settings.length > 0) {
    await AdminSetting.create({
      name: settings[0].name || "Admin",
      title: settings[0].title || "Administrator",
    });
  } else {
    await AdminSetting.create({ name: "Admin", title: "Administrator" });
  }
  log("admin_settings: 1");

  /* ---------- daily_notes ---------- */
  const [notes] = await mysqlConn.query("SELECT * FROM daily_notes");
  if (notes.length > 0) {
    await DailyNote.insertMany(
      notes.map((n) => ({
        note: n.note,
        created_at: n.created_at ? new Date(n.created_at) : new Date(),
      }))
    );
  }
  log("daily_notes:", notes.length);

  await mysqlConn.end();
  await mongoose.disconnect();
  log("DONE ✅");
}

main().catch((err) => {
  console.error("[migrate] FAILED ❌", err);
  process.exit(1);
});
