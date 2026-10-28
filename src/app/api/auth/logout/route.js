export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { RevokedToken } from "@/models/RevokedToken";
import { getBearerToken } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

export async function POST(req) {
  try {
    await connectDB();
    const token = getBearerToken(req);
    if (!token) return jsonError("No token provided", 401);

    await RevokedToken.create({
      token,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    return Response.json({ message: "Logout successful" });
  } catch (error) {
    console.log(error);
    return jsonError("Server error");
  }
}
