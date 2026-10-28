export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { DailyNote } from "@/models/DailyNote";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { note } = await req.json();
    const { id } = await params;

    await DailyNote.updateOne({ _id: id }, { $set: { note } });

    return Response.json({ message: "Note updated successfully" });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    await DailyNote.deleteOne({ _id: id });

    return Response.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
