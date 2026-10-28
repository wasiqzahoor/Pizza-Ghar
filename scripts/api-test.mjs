const BASE = "http://localhost:3001";

async function login() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "EPG@gmail.com", password: "admin123" }),
  });
  const j = await r.json();
  return j.token;
}

async function main() {
  const token = await login();
  const auth = { Authorization: `Bearer ${token}` };

  // Create product with FormData (like Menu.jsx does)
  const fd = new FormData();
  fd.append("name", "ZTEST Multipart");
  fd.append("price", "150");
  fd.append("category", "Fast Food");
  let res = await fetch(`${BASE}/api/products`, { method: "POST", headers: auth, body: fd });
  console.log("create:", res.status, await res.text());

  // Find it
  res = await fetch(`${BASE}/api/products?q=ZTEST`, { headers: auth });
  const found = (await res.json()).rows[0];
  console.log("found:", JSON.stringify(found));

  // Update
  const fd2 = new FormData();
  fd2.append("name", "ZTEST Renamed");
  fd2.append("price", "275");
  fd2.append("category", "Fast Food");
  res = await fetch(`${BASE}/api/products/${found.id}`, { method: "PUT", headers: auth, body: fd2 });
  console.log("update:", res.status, await res.text());

  // Verify
  res = await fetch(`${BASE}/api/products?q=ZTEST`, { headers: auth });
  const after = (await res.json()).rows[0];
  console.log("after update:", after.name, after.price);

  // Delete
  res = await fetch(`${BASE}/api/products/${after.id}`, { method: "DELETE", headers: auth });
  console.log("delete:", res.status, await res.text());

  // Categories CRUD
  res = await fetch(`${BASE}/api/categories`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "ZTEST Cat" }) });
  console.log("cat create:", res.status, await res.text());
  res = await fetch(`${BASE}/api/categories`, { headers: auth });
  const cats = await res.json();
  const zcat = cats.find((c) => c.name === "ZTEST Cat");
  if (zcat) {
    res = await fetch(`${BASE}/api/categories/${zcat.id}`, { method: "PUT", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "ZTEST Cat2" }) });
    console.log("cat update:", res.status);
    res = await fetch(`${BASE}/api/categories/${zcat.id}`, { method: "DELETE", headers: auth });
    console.log("cat delete:", res.status, await res.text());
  }

  // Inventory CRUD
  res = await fetch(`${BASE}/api/inventory`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ name: "ZTEST Flour", quantity: 10, unit: "kg", min_quantity: 2 }) });
  const inv = await res.json();
  console.log("inv create:", res.status, JSON.stringify(inv));
  if (inv.id) {
    res = await fetch(`${BASE}/api/inventory/${inv.id}`, { method: "PUT", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ quantity: 20 }) });
    console.log("inv update:", res.status, await res.text());
    res = await fetch(`${BASE}/api/inventory/${inv.id}`, { method: "DELETE", headers: auth });
    console.log("inv delete:", res.status, await res.text());
  }

  // Users list + role update
  res = await fetch(`${BASE}/api/users?limit=50`, { headers: auth });
  const users = await res.json();
  console.log("users total:", users.total ?? users.rows?.length ?? JSON.stringify(users).slice(0, 200));

  // Orders list filters
  res = await fetch(`${BASE}/api/orders?limit=1&deleted=1`, { headers: auth });
  const del = await res.json();
  console.log("deleted orders:", del.total);
  res = await fetch(`${BASE}/api/orders?limit=1&status=ready`, { headers: auth });
  const ready = await res.json();
  console.log("ready orders:", ready.total);
  res = await fetch(`${BASE}/api/orders?date=2026-10-26&limit=1`, { headers: auth });
  const day = await res.json();
  console.log("orders on 2026-10-26:", day.total);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
