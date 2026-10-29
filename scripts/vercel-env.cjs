const { execFileSync } = require("child_process");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const keys = [
  "MONGODB_URI", "MONGODB_DB", "JWT_SECRET",
  "EMAIL_USER", "EMAIL_PASS", "TZ", "RESTAURANT_OWNER_EMAIL",
  "CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
];

let ok = 0, fail = 0;
for (const k of keys) {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  if (!m || !m[1]) { console.log("skip (empty/missing):", k); continue; }
  for (const stage of ["production", "preview"]) {
    try {
      execFileSync("vercel", ["env", "add", k, stage], {
        input: m[1],
        shell: true,
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });
      console.log("added:", k, "->", stage);
      ok++;
    } catch (e) {
      const out = ((e.stdout || "") + (e.stderr || "")).trim().split("\n").pop();
      console.log("FAIL:", k, stage, "-", out);
      fail++;
    }
  }
}
console.log(`done: ${ok} added, ${fail} failed`);
