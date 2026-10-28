/* Shared pagination helpers — same behavior as the old Express version */

export function getPaging(searchParams, { def = 20, max = 100 } = {}) {
  let page = parseInt(searchParams.get("page"), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = parseInt(searchParams.get("limit"), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = def;
  if (limit > max) limit = max;

  const offset = (page - 1) * limit;

  const rawQ = searchParams.get("q");
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : "";

  return { page, limit, offset, q };
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(v) {
  return typeof v === "string" && DATE_RE.test(v);
}

export function jsonError(message, status = 500) {
  return Response.json({ message }, { status });
}
