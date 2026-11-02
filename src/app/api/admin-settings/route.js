export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { AdminSetting } from "@/models/AdminSetting";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

function settingsJson(settings) {
  return {
    id: settings._id,
    name: settings.name,
    title: settings.title,
    autoDualPrint: !!settings.autoDualPrint,
    billPrinter: settings.billPrinter || "Black Copper",
    kitchenPrinter: settings.kitchenPrinter || "POS 80X",
  };
}

export async function GET() {
  try {
    await connectDB();
    let settings = await AdminSetting.findOne().lean();
    if (!settings) {
      settings = await AdminSetting.create({ name: "Admin", title: "Administrator" });
      settings = settings.toObject();
    }

    return Response.json(settingsJson(settings));
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await req.json();

    let settings = await AdminSetting.findOne();
    if (!settings) settings = new AdminSetting();

    if (body.name !== undefined) settings.name = String(body.name);
    if (body.title !== undefined) settings.title = String(body.title);
    if (body.autoDualPrint !== undefined) settings.autoDualPrint = !!body.autoDualPrint;
    if (body.billPrinter !== undefined) {
      settings.billPrinter = String(body.billPrinter).trim() || "Black Copper";
    }
    if (body.kitchenPrinter !== undefined) {
      settings.kitchenPrinter = String(body.kitchenPrinter).trim() || "POS 80X";
    }
    await settings.save();

    return Response.json({ message: "Settings updated successfully", ...settingsJson(settings) });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}
