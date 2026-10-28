import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global._mongooseConnect;
if (!cached) {
  cached = global._mongooseConnect = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: process.env.MONGODB_DB || "restaurant_pos",
      })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
