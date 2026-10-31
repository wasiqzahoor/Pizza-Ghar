import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

/* Read session token from cookie (set at login) for server components. */
export async function getServerToken() {
  try {
    const store = await cookies();
    const token = store.get("pg_token")?.value;
    if (!token) return null;
    jwt.verify(token, process.env.JWT_SECRET);
    return token;
  } catch {
    return null;
  }
}

/* Invoke an API route handler's GET directly (no HTTP hop) from a server component. */
export async function callRoute(loader, pathAndQuery, token) {
  try {
    const mod = await loader();
    const req = new Request("http://internal.local" + pathAndQuery, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const res = await mod.GET(req);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (e) {
    console.log("callRoute failed:", e?.message || e);
    return null;
  }
}
