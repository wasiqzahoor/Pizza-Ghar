export const dynamic = "force-dynamic";

import { verifyBearer } from "@/lib/auth";

export async function GET(req) {
  const result = await verifyBearer(req);
  if (result.error) {
    return Response.json({ message: result.error }, { status: result.status });
  }
  return Response.json({ valid: true, user: result.user });
}
