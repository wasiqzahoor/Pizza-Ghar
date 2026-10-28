export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { DailyNote } from "@/models/DailyNote";
import { jsonError } from "@/lib/paging";

export async function GET() {
  try {
    await connectDB();
    const rows = await DailyNote.find().sort({ created_at: -1 }).lean();

    return Response.json(
      rows.map((r) => ({
        id: r._id,
        note: r.note,
        created_at: r.created_at,
      }))
    );
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const { note } = await req.json();

    await DailyNote.create({ note });

    return Response.json({ message: "Note added successfully" });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Failed to add note" }, { status: 500 });
  }
}
