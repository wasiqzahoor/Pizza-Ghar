"use client";

import { API_BASE } from "@/config/api";
import { showAlert } from "@/utils/popup";

/* ============================================================
   Automatic Dual Printer printing (QZ Tray)
   ------------------------------------------------------------
   Central decision point: when the admin toggle is ON, receipts
   go silently to the assigned printers (bill / kitchen) through
   the QZ Tray desktop app. When OFF, nothing here runs — the
   normal browser print dialog flow is used.
   ============================================================ */

const DEFAULTS = {
  autoDualPrint: false,
  billPrinter: "",
  kitchenPrinter: "",
};

const QZ_LIB_URL = "https://cdn.jsdelivr.net/npm/qz-tray@2.3.0/qz-tray.js";

/* Always reads fresh from the server so the admin toggle applies
   to the very next print — no restart / relogin needed. */
export async function getPrintSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/admin-settings`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return {
        autoDualPrint: !!data.autoDualPrint,
        billPrinter: (data.billPrinter || "").trim() || DEFAULTS.billPrinter,
        kitchenPrinter: (data.kitchenPrinter || "").trim() || DEFAULTS.kitchenPrinter,
      };
    }
  } catch {
    /* unreachable → keep defaults (auto print OFF) */
  }
  return { ...DEFAULTS };
}

function withTimeout(promise, ms, message) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function friendlyError(err) {
  const msg = String(err?.message || err || "");
  if (!msg) return "QZ Tray printing failed.";
  if (/Printer\s+"|not found|Installed printers/i.test(msg)) return msg;
  if (/local network access|Chrome (is blocking|blocked)/i.test(msg)) return msg;
  if (/trust|certificate|denied/i.test(msg)) {
    return "QZ Tray connection was not approved. Approve the QZ Tray prompt on this computer and try again.";
  }
  if (/timeout|timed out/i.test(msg)) return msg;
  if (/load QZ Tray library/i.test(msg)) return msg;
  if (/connect|socket|websocket|running/i.test(msg)) {
    return "QZ Tray is not running on this computer. Open the QZ Tray app and try again.";
  }
  return msg;
}

/* Chrome 147+ "Local Network Access": a public site cannot reach
   localhost (QZ Tray) until the user allows it. Query the granular
   permission (never the legacy combined name) to tell an LNA block
   apart from QZ Tray simply not running. */
export async function getLoopbackPermission() {
  try {
    const status = await navigator.permissions.query({ name: "loopback-network" });
    return status.state; /* "granted" | "prompt" | "denied" */
  } catch {
    return "unknown"; /* browser without LNA → not the cause */
  }
}

/* Silent signed connection: QZ Tray trusts this website without any
   Allow prompts — the public cert identifies us, /api/qz-sign signs
   each call with the private key from Vercel. If the cert cannot be
   loaded QZ falls back to the normal anonymous prompt flow. */
let qzSecurityDone = false;
function setupQzSecurity(qz) {
  if (qzSecurityDone || !qz?.security) return;
  qzSecurityDone = true;

  qz.security.setCertificatePromise(async () => {
    const res = await fetch(`${API_BASE}/qz-cert.pem`, { cache: "no-store" });
    if (!res.ok) throw new Error("certificate unavailable");
    return res.text();
  });
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    let token = null;
    try {
      token = localStorage.getItem("token");
    } catch {
      /* no storage access */
    }
    fetch(`${API_BASE}/api/qz-sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ toSign }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.signature) {
          throw new Error(data.error || "Signing failed.");
        }
        return data.signature;
      })
      .then(resolve)
      .catch(reject);
  });
}

/* Load qz-tray.js from CDN once (cached on window.qz). */
let qzLibPromise = null;
function loadQz() {
  if (window.qz) {
    setupQzSecurity(window.qz);
    return Promise.resolve(window.qz);
  }
  if (qzLibPromise) return qzLibPromise;

  qzLibPromise = new Promise((resolve, reject) => {
    const fail = () => {
      qzLibPromise = null;
      reject(new Error("Could not load the QZ Tray library. Check the internet connection."));
    };
    const el = document.createElement("script");
    el.src = QZ_LIB_URL;
    el.async = true;
    el.onload = () => {
      if (!window.qz) return fail();
      setupQzSecurity(window.qz);
      resolve(window.qz);
    };
    el.onerror = fail;
    document.head.appendChild(el);
  });
  return qzLibPromise;
}

/* Connect to the QZ Tray desktop app (signed → no prompt). */
async function connectQz() {
  const qz = await loadQz();
  /* qz API: isActive() (there is no isConnected()) */
  if (typeof qz.websocket.isActive === "function" && qz.websocket.isActive()) return qz;
  try {
    await withTimeout(qz.websocket.connect(), 30000, "Connecting to QZ Tray timed out.");
  } catch {
    const lna = await getLoopbackPermission();
    if (lna === "prompt" || lna === "denied") {
      const err = new Error(
        lna === "denied"
          ? "Chrome blocked local network access for this site (Loopback network = Block)."
          : "Chrome is blocking QZ Tray until you allow local network access."
      );
      err.lnaBlocked = lna;
      throw err;
    }
    throw new Error(
      "QZ Tray is not running or the connection was not approved. Open the QZ Tray app on this computer and try again."
    );
  }
  return qz;
}

/* Exact printer must exist — never fall back to another printer. */
async function ensurePrinter(qz, name) {
  let found = null;
  try {
    found = await withTimeout(qz.printers.find(name), 10000, `Printer lookup timed out.`);
  } catch {
    found = null;
  }
  if (!found) {
    let list = null;
    try {
      list = await qz.printers.find();
    } catch {
      list = null;
    }
    const hint =
      Array.isArray(list) && list.length
        ? ` Installed printers: ${list.join(", ")}.`
        : "";
    throw new Error(`Printer "${name}" not found.${hint}`);
  }
  return found;
}

async function preparePrinter(kind) {
  const settings = await getPrintSettings();
  const printer = (
    kind === "kitchen" ? settings.kitchenPrinter : settings.billPrinter
  ).trim();
  if (!printer) {
    throw new Error(
      kind === "kitchen"
        ? "No kitchen receipt printer selected. Open Settings and choose a printer."
        : "No customer bill printer selected. Open Settings and choose a printer."
    );
  }
  const qz = await connectQz();
  await ensurePrinter(qz, printer);
  return { qz, printer, settings };
}

/* Live list of printers installed on THIS computer, exactly as QZ Tray
   reports them (no hardcoded names). Throws a friendly error when QZ Tray
   is not running / not connected so the UI can offer Retry. */
export async function listQzPrinters() {
  try {
    const qz = await connectQz();
    /* qz.printers.find() with no query returns ALL installed printers */
    const list = await withTimeout(
      qz.printers.find(),
      15000,
      "Printer detection timed out."
    );
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => String(a).localeCompare(String(b)));
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}

/* PREFLIGHT for one-time kitchen prints: called BEFORE the server
   claims the print, so a disconnected QZ / missing printer can never
   mark the receipt as printed. Auto mode OFF → instant pass, QZ is
   never touched. Returns { ok, auto } (+ nothing else on failure). */
export async function autoPrintPreflight(kind) {
  try {
    const settings = await getPrintSettings();
    if (!settings.autoDualPrint) return { ok: true, auto: false };
    await preparePrinter(kind);
    return { ok: true, auto: true };
  } catch (err) {
    showAlert(friendlyError(err), "error");
    return { ok: false, auto: true };
  }
}

/* ACTUAL silent print — used by printHtml() when auto mode is ON.
   onDone({ ok }) fires only after the job was truly accepted by QZ;
   on failure an alert explains exactly what went wrong. */
export async function qzPrintReceipt(html, kind, onDone) {
  try {
    const { qz, printer } = await preparePrinter(kind);

    const config = qz.configs.create(printer, { units: "mm", margins: 0 });
    const data = [
      {
        type: "pixel",
        format: "html",
        flavor: "plain",
        data: html,
        options: { pageWidth: 80 },
      },
    ];

    await withTimeout(qz.print(config, data), 30000, "Printing timed out.");
    if (typeof onDone === "function") onDone({ ok: true });
  } catch (err) {
    console.error("QZ print error:", err);
    showAlert(friendlyError(err), "error");
    if (typeof onDone === "function") onDone({ ok: false });
  }
}
