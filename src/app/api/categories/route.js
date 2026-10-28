export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { jsonError } from "@/lib/paging";

export async function GET() {
  try {
    await connectDB();
    const rows = await Category.find().sort({ _id: -1 }).lean();

    return Response.json(
      rows.map((r) => ({
        id: r._id,
        name: r.name,
      }))
    );
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const { name } = await req.json();

    await Category.create({ name });

    return Response.json({ message: "Category added" });
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}
