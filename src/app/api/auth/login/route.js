export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function POST(req) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const user = await User.findOne({ email });
    if (!user) return jsonError("Invalid email or password", 401);

    const match = await bcrypt.compare(password, user.password || "");
    if (!match) return jsonError("Invalid email or password", 401);

    const token = signToken({ id: String(user._id), role: user.role });

    return Response.json({
      token,
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
