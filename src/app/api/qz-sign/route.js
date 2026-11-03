import crypto from "crypto";
import { requireAuth } from "@/lib/auth";

/* Signs QZ Tray API calls with the private key kept in the Vercel
   environment variable QZ_PRIVATE_KEY. Requires a logged-in user —
   this is what lets QZ Tray trust the website silently (no Allow
   prompts) instead of asking on every print. */

export async function POST(req) {
  const auth = await requireAuth(req);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const key = process.env.QZ_PRIVATE_KEY;
  if (!key) {
    return Response.json({ error: "QZ signing key not configured." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const toSign = body?.toSign;
  if (typeof toSign !== "string" || !toSign || toSign.length > 10000) {
    return Response.json({ error: "Missing data to sign." }, { status: 400 });
  }

  try {
    const sign = crypto.createSign("RSA-SHA512");
    sign.update(toSign);
    return Response.json({ signature: sign.sign(key, "base64") });
  } catch {
    return Response.json({ error: "Signing failed." }, { status: 500 });
  }
}
