export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { AdminSetting } from "@/models/AdminSetting";
import { jsonError } from "@/lib/paging";

export async function GET() {
  try {
    await connectDB();
    let settings = await AdminSetting.findOne().lean();
    if (!settings) {
      settings = await AdminSetting.create({ name: "Admin", title: "Administrator" });
      settings = settings.toObject();
    }

    return Response.json({
      id: settings._id,
      name: settings.name,
      title: settings.title,
    });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const { name, title } = await req.json();

    let settings = await AdminSetting.findOne();
    if (!settings) {
      settings = new AdminSetting({ name, title });
    } else {
      settings.name = name;
      settings.title = title;
    }
    await settings.save();

    return Response.json({ message: "Settings updated successfully", name, title });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}
