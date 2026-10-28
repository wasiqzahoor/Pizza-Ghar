/* Normalize image path from DB ("/uploads/x.jpg") to a same-origin URL.
   Avoids the old "//uploads/..." protocol-relative bug. */
export function imgUrl(p) {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  return "/" + String(p).replace(/^\/+/, "");
}
