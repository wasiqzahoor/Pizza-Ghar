export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { jsonError } from "@/lib/paging";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { name } = await req.json();

    await Category.updateOne({ _id: id }, { $set: { name } });

    return Response.json({ message: "Category updated" });
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    await Category.deleteOne({ _id: id });

    return Response.json({ message: "Category deleted" });
  } catch (err) {
    console.log(err);
    return jsonError("Server error");
  }
}
