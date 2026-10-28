export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { jsonError } from "@/lib/paging";

export async function POST(req) {
  try {
    await connectDB();
    const { name, email, password } = await req.json();

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({ name, email, password: hashedPassword, role: "admin" });

    return Response.json({ message: "Admin registered successfully" });
  } catch (err) {
    console.log(err);
    return jsonError("Registration failed");
  }
}
