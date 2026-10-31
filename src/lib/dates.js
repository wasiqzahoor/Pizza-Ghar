/* Date helpers — server TZ aware (Asia/Karachi by default).
   Vercel sets TZ=":UTC" (reserved) — ignore colon-prefixed values. */
const envTZ = process.env.TZ && !process.env.TZ.startsWith(":") ? process.env.TZ : "";
export const TZ = envTZ || "Asia/Karachi";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PARTS_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function tzParts(date) {
  const map = {};
  for (const p of PARTS_FMT.formatToParts(date)) map[p.type] = p.value;
  map.hour = Number(map.hour) % 24;
  return map;
}

/* ms offset of TZ at the given instant (wall-clock-as-UTC minus real UTC) */
function tzOffsetMs(date) {
  const p = tzParts(date);
  const asUTC = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    p.hour, Number(p.minute), Number(p.second)
  );
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/* wall-clock Y-M-D h:m:s in TZ → UTC Date */
export function zonedToUtc(y, m, d, h = 0, mi = 0, s = 0) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  const offset = tzOffsetMs(new Date(guess));
  const result = new Date(guess - offset);
  // refine once for DST boundaries (fixed offsets converge immediately)
  const offset2 = tzOffsetMs(result);
  return offset2 === offset ? result : new Date(guess - offset2);
}

export function dayName(date) {
  return DAY_NAMES[new Date(date).getDay()];
}

export function monthName(date) {
  return MONTH_NAMES[new Date(date).getMonth()];
}

/* "YYYY-MM-DD" in server TZ */
export function toDateKey(date) {
  const p = tzParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function hourOfDay(date) {
  return tzParts(date).hour;
}

export function monthOfYear(date) {
  return Number(tzParts(date).month);
}

export function startOfDay(date) {
  const p = tzParts(date);
  return zonedToUtc(Number(p.year), Number(p.month), Number(p.day));
}

export function endOfDay(date) {
  return new Date(startOfDay(date).getTime() + 24 * 3600 * 1000);
}

/* "YYYY-MM-DD" → [start, end) Date range in server TZ */
export function dayRange(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = zonedToUtc(y, m, d);
  return [start, new Date(start.getTime() + 24 * 3600 * 1000)];
}

/* "YYYY-MM-DD" → end-of-day Date (inclusive) */
export function dayEnd(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(zonedToUtc(y, m, d).getTime() + 24 * 3600 * 1000 - 1);
}

export function formatKitchenDate(date) {
  const p = tzParts(date);
  return `${p.day}-${p.month}-${p.year}`;
}

export function formatKitchenTime(date) {
  const p = tzParts(date);
  let h = p.hour;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${p.minute} ${ampm}`;
}

/* Deterministic list/table date+time (same output on server & client) */
export function formatListDate(date) {
  const p = tzParts(date);
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatListTime(date) {
  const p = tzParts(date);
  let h = p.hour;
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${p.minute} ${ampm}`;
}
