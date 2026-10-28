export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Recipe } from "@/models/Recipe";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    await Recipe.deleteOne({ _id: id });

    return Response.json({ message: "Deleted" });
  } catch {
    return jsonError("Server error");
  }
}
