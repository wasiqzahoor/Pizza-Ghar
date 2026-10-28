export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { OtpCode } from "@/models/OtpCode";
import { jsonError } from "@/lib/paging";

export async function POST(req) {
  try {
    await connectDB();
    const { code } = await req.json();

    const row = await OtpCode.findOne({ otp: String(code) }).sort({ created: -1 });
    if (!row) return jsonError("Invalid code", 400);

    return Response.json({ message: "Code verified" });
  } catch (err) {
    console.log(err);
    return jsonError("Verification failed");
  }
}
