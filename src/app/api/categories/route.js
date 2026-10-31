export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { nextSeq } from "@/models/Counter";
import { jsonError } from "@/lib/paging";

export async function GET() {
  try {
    await connectDB();
    const rows = await Category.find().sort({ seq: 1, _id: 1 }).lean();

    return Response.json(
      rows.map((r) => ({
        id: r._id,
        seq: r.seq,
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

    const seq = await nextSeq("category");
    await Category.create({ name, seq });

    return Response.json({ message: "Category added" });
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}
