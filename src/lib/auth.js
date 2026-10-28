import jwt from "jsonwebtoken";
import { RevokedToken } from "@/models/RevokedToken";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function getBearerToken(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  return authHeader.split(" ")[1] || null;
}

export async function verifyBearer(req) {
  await connectDB();
  const token = getBearerToken(req);
  if (!token) return { error: "No token", status: 401 };

  const revoked = await RevokedToken.findOne({ token });
  if (revoked) return { error: "Token expired", status: 401 };

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded, token };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function requireAuth(req) {
  const result = await verifyBearer(req);
  if (result.error) return { error: result.error, status: result.status };
  return { user: result.user, token: result.token };
}

export async function requireAdmin(req) {
  const result = await requireAuth(req);
  if (result.error) return { error: result.error, status: result.status };
  if (result.user.role !== "admin") return { error: "Admin only", status: 403 };
  return result;
}
