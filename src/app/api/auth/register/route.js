export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { jsonError } from "@/lib/paging";

export async function POST(req) {
  try {
    await connectDB();
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return jsonError("Email, password and role required", 400);
    }

    const existing = await User.findOne({ email });
    if (existing) return jsonError("User already exists", 409);

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword, role });

    return Response.json({ message: "Registered successfully" }, { status: 201 });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
