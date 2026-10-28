export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAdmin(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const { role } = await req.json();

    await User.updateOne({ _id: id }, { $set: { role } });

    return Response.json({ message: "Updated" });
  } catch {
    return jsonError("Server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAdmin(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    await User.deleteOne({ _id: id });

    return Response.json({ message: "Deleted" });
  } catch {
    return jsonError("Server error");
  }
}
