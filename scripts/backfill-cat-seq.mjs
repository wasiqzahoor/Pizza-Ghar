/* Backfill numeric seq for categories using legacy MySQL ids (by name).
   Run: node --env-file=.env.local --env-file="E:/Restaurant System/routes/.env" scripts/backfill-cat-seq.mjs */

import mysql from "mysql2/promise";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/mongodb.js";
import { Category } from "../src/models/Category.js";
import { Counter } from "../src/models/Counter.js";

const log = (...a) => console.log("[seq]", ...a);

async function main() {
  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  const [oldCats] = await mysqlConn.query("SELECT id, name FROM categories ORDER BY id ASC");
  await mysqlConn.end();
  log("legacy categories:", oldCats.length);

  await connectDB();
  log("mongo:", mongoose.connection.db.databaseName);

  const byName = new Map(oldCats.map((c) => [String(c.name).trim().toLowerCase(), Number(c.id)]));
  const used = new Set(byName.values());
  let maxSeq = used.size ? Math.max(...used) : 0;

  const docs = await Category.find().sort({ _id: 1 }).lean();
  let matched = 0, fresh = 0;
  for (const d of docs) {
    const key = String(d.name ?? "").trim().toLowerCase();
    let seq = byName.get(key);
    if (!seq) {
      do { maxSeq++; } while (used.has(maxSeq));
      used.add(maxSeq);
      seq = maxSeq;
      fresh++;
    } else {
      matched++;
    }
    await Category.updateOne({ _id: d._id }, { $set: { seq } });
  }

  const finalMax = used.size ? Math.max(...used) : docs.length;
  await Counter.updateOne({ key: "category" }, { $set: { seq: finalMax } }, { upsert: true });

  log(`backfilled: ${matched} matched legacy ids, ${fresh} new numbers, counter=${finalMax}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
