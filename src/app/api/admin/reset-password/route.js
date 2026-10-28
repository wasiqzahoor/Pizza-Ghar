export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { jsonError } from "@/lib/paging";

export async function POST(req) {
  try {
    await connectDB();
    const { email, newPassword } = await req.json();

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    return Response.json({ message: "Password updated successfully" });
  } catch (err) {
    console.log(err);
    return jsonError("Password reset failed");
  }
}
