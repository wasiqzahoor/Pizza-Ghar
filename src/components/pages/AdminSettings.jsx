"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useAuthCheck from "@/hooks/useAuthCheck";
import {
  KeyRound,
  History,
  StickyNote,
  Save,
  Pencil,
  Trash2,
  Printer,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { showAlert, showConfirm } from "@/utils/popup";
import { listQzPrinters } from "@/utils/autoPrint";

export default function AdminSettings({ initialNotes = null, initialPrint = null }) {
  useAuthCheck();

  const router = useRouter();

  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(() => initialNotes || []);
  const [editId, setEditId] = useState(null);

  /* Automatic Dual Printer Printing (QZ Tray) */
  const [autoPrint, setAutoPrint] = useState(() => !!initialPrint?.autoDualPrint);
  const [billPrinter, setBillPrinter] = useState(initialPrint?.billPrinter || "");
  const [kitchenPrinter, setKitchenPrinter] = useState(
    initialPrint?.kitchenPrinter || ""
  );

  /* live printers detected on this computer through QZ Tray */
  const [printers, setPrinters] = useState([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printersError, setPrintersError] = useState("");
  const [missingPrinters, setMissingPrinters] = useState([]);
  /* Chrome 147+ Local Network Access block: "prompt" (needs an Allow
     click) or "denied" (must be re-enabled in Chrome site settings) */
  const [lnaBlocked, setLnaBlocked] = useState("");

  /* automatic reconnect: while the page is open we keep retrying on our
     own, so printers show up as soon as QZ Tray is reachable — the user
     never has to click Retry */
  const detectInFlight = useRef(false);
  const autoRetryTimer = useRef(null);
  const detectFailed = useRef(false);
  const isMounted = useRef(true);
  const billRef = useRef(billPrinter);
  const kitchenRef = useRef(kitchenPrinter);
  billRef.current = billPrinter;
  kitchenRef.current = kitchenPrinter;

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/daily-notes`);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    }
  };

  const fetchPrintSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin-settings`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      setAutoPrint(!!data.autoDualPrint);
      setBillPrinter((data.billPrinter || "").trim());
      setKitchenPrinter((data.kitchenPrinter || "").trim());
      return data;
    } catch {
      return null;
    }
  };

  /* Detect installed printers through QZ Tray. `seed` carries the latest
     saved names when called right after a settings fetch (state may not
     have re-rendered yet); Refresh/Retry use the current component state.
     `silent` runs without the spinner and schedules the next auto-retry. */
  const detectPrinters = async (seed, silent = false) => {
    if (detectInFlight.current) return;
    const currentBill = (seed?.billPrinter ?? billRef.current) || "";
    const currentKitchen = (seed?.kitchenPrinter ?? kitchenRef.current) || "";

    detectInFlight.current = true;
    if (!silent) {
      setPrintersLoading(true);
      setPrintersError("");
    }

    const scheduleRetry = () => {
      detectFailed.current = true;
      clearTimeout(autoRetryTimer.current);
      if (isMounted.current) {
        autoRetryTimer.current = setTimeout(() => {
          detectPrinters(undefined, true);
        }, 5000);
      }
    };

    try {
      const list = await listQzPrinters();

      if (!list.length) {
        setPrinters([]);
        setMissingPrinters([]);
        clearTimeout(autoRetryTimer.current);
        setPrintersError(
          "No printers detected on this computer. Connect a printer and click Refresh Printers."
        );
        return;
      }

      /* a saved printer that is no longer installed → clear it + warn */
      const missing = [];
      if (currentBill && !list.includes(currentBill)) {
        missing.push(`Customer Bill: ${currentBill}`);
        setBillPrinter("");
      }
      if (currentKitchen && !list.includes(currentKitchen)) {
        missing.push(`Kitchen Receipt: ${currentKitchen}`);
        setKitchenPrinter("");
      }

      detectFailed.current = false;
      clearTimeout(autoRetryTimer.current);
      setPrinters(list);
      setMissingPrinters(missing);
      setPrintersError("");
      setLnaBlocked("");
    } catch (err) {
      setPrinters([]);
      setMissingPrinters([]);
      const lna = err?.lnaBlocked || "";
      setLnaBlocked(lna);
      setPrintersError(
        (err?.message || "QZ Tray is not running on this computer.") +
          (silent && lna !== "denied" ? " — retrying automatically…" : "")
      );
      if (lna === "denied") {
        /* user must change a Chrome setting first — auto-retry is
           pointless (and repeated attempts risk Chrome auto-blocking) */
        detectFailed.current = true;
        clearTimeout(autoRetryTimer.current);
      } else {
        scheduleRetry();
      }
    } finally {
      detectInFlight.current = false;
      if (!silent) setPrintersLoading(false);
    }
  };

  /* "Allow Access": runs inside a click (user gesture) so Chrome can
     show the Local Network Access prompt — try the Permissions API
     first, then connect (the WebSocket attempt itself can prompt too). */
  const handleAllowAccess = async () => {
    try {
      if (navigator.permissions?.request) {
        await navigator.permissions.request({ name: "loopback-network" });
      }
    } catch {
      /* unsupported → the connection attempt below triggers the prompt */
    }
    detectPrinters();
  };

  /* stop the retry loop when the page closes */
  useEffect(() => {
    return () => {
      isMounted.current = false;
      clearTimeout(autoRetryTimer.current);
    };
  }, []);

  /* coming back to this tab → try immediately if the last attempt failed */
  useEffect(() => {
    const onFocus = () => {
      if (detectFailed.current && !detectInFlight.current) {
        detectPrinters(undefined, true);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const didInitialLoad = useRef(!initialNotes);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      return;
    }
    fetchNotes();
  }, []);

  /* fetch saved settings (if not SSR'd) then auto-detect printers
     when the printer settings section is opened */
  useEffect(() => {
    (async () => {
      let seed = null;
      if (!initialPrint) {
        seed = await fetchPrintSettings();
      }
      await detectPrinters({
        billPrinter: seed ? (seed.billPrinter || "").trim() : initialPrint?.billPrinter || "",
        kitchenPrinter: seed
          ? (seed.kitchenPrinter || "").trim()
          : initialPrint?.kitchenPrinter || ""
      });
    })();
  }, []);

  const handleSavePrint = async () => {
    if (autoPrint) {
      if (printersLoading) {
        return showAlert("Printer detection is running — please wait", "warning");
      }
      if (printersError) {
        return showAlert(
          "Connect QZ Tray and detect printers first, or turn the toggle OFF",
          "warning"
        );
      }
      if (!billPrinter || !printers.includes(billPrinter)) {
        return showAlert("Select an available customer bill printer", "warning");
      }
      if (!kitchenPrinter || !printers.includes(kitchenPrinter)) {
        return showAlert("Select an available kitchen receipt printer", "warning");
      }
    }

    try {
      const body = { autoDualPrint: autoPrint };
      if (billPrinter) body.billPrinter = billPrinter;
      if (kitchenPrinter) body.kitchenPrinter = kitchenPrinter;

      const res = await fetch(`${API_BASE}/api/admin-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return showAlert(data.error || "Could not save print settings", "error");
      }

      showAlert(
        autoPrint
          ? "Print settings saved — auto printing ON"
          : "Print settings saved — auto printing OFF (browser dialog)",
        "success"
      );
    } catch {
      showAlert("Could not save print settings", "error");
    }
  };

  const handleSave = async () => {
    if (!note.trim()) return showAlert("Write a note first", "warning");

    try {
      if (editId) {
        await fetch(`${API_BASE}/api/daily-notes/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note })
        });
        showAlert("Note updated", "success");
      } else {
        await fetch(`${API_BASE}/api/daily-notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note })
        });
        showAlert("Note added", "success");
      }

      setNote("");
      setEditId(null);
      fetchNotes();
    } catch {
      showAlert("Could not save note", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Delete this note?", { danger: true }))) return;

    try {
      await fetch(`${API_BASE}/api/daily-notes/${id}`, {
        method: "DELETE"
      });
      showAlert("Note deleted", "success");
      fetchNotes();
    } catch {
      showAlert("Delete failed", "error");
    }
  };

  const handleEdit = (n) => {
    setNote(n.note);
    setEditId(n.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl">

      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      {/* QUICK ACTIONS */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <KeyRound size={18} className="text-red-500" /> Quick Actions
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/forgot-password")}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg"
          >
            <KeyRound size={16} /> Reset Password
          </button>

          <button
            onClick={() => router.push("/admin/order-history")}
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-black transition text-white px-4 py-2 rounded-lg"
          >
            <History size={16} /> Order History (Deleted)
          </button>
        </div>
      </div>

      {/* AUTOMATIC DUAL PRINTER PRINTING (QZ TRAY) */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Printer size={18} className="text-emerald-600" /> Automatic Dual Printer Printing
        </h3>

        {/* QZ CONNECTION / EMPTY STATE */}
        {printersError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>
              {printersError}
              {lnaBlocked === "prompt" && (
                <>
                  {" "}
                  Click <b>Allow Access</b> below, then choose <b>Allow</b> in the
                  Chrome popup (“Access other apps and services on this device”).
                  If no popup appears, open Chrome Settings → Site settings →
                  this site → <b>Loopback network</b> → <b>Allow</b>, then retry.
                </>
              )}
              {lnaBlocked === "denied" && (
                <>
                  {" "}
                  Open Chrome Settings → Site settings → this site →{" "}
                  <b>Loopback network</b> → <b>Allow</b>, then click Retry
                  Connection.
                </>
              )}
            </span>
            <button
              onClick={lnaBlocked === "prompt" ? handleAllowAccess : () => detectPrinters()}
              disabled={printersLoading}
              className="shrink-0 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-60"
            >
              <RefreshCw size={14} className={printersLoading ? "animate-spin" : ""} />
              {lnaBlocked === "prompt" ? "Allow Access" : "Retry Connection"}
            </button>
          </div>
        )}

        {/* SAVED PRINTER NO LONGER AVAILABLE */}
        {missingPrinters.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-3 mb-4 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Saved printer no longer available: {missingPrinters.join(", ")}. Please
              select an available printer.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="font-medium">Enable Automatic Dual Printer Printing</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoPrint}
            onClick={() => setAutoPrint(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              autoPrint ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                autoPrint ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {autoPrint
            ? "ON — customer bills print silently to the bill printer and kitchen receipts to the kitchen printer through QZ Tray (no browser dialog)."
            : "OFF — the normal browser print dialog opens, exactly as before."}
        </p>

        {/* PRINTER DROPDOWNS (detected through QZ Tray) */}
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Customer Bill Printer
            </label>
            <select
              value={printers.includes(billPrinter) ? billPrinter : ""}
              onChange={(e) => setBillPrinter(e.target.value)}
              disabled={printersLoading}
              className="w-full border rounded-lg p-2 text-sm bg-white disabled:bg-gray-50"
            >
              <option value="">Select Printer</option>
              {printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Kitchen Receipt Printer
            </label>
            <select
              value={printers.includes(kitchenPrinter) ? kitchenPrinter : ""}
              onChange={(e) => setKitchenPrinter(e.target.value)}
              disabled={printersLoading}
              className="w-full border rounded-lg p-2 text-sm bg-white disabled:bg-gray-50"
            >
              <option value="">Select Printer</option>
              {printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DETECT STATUS + REFRESH */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-sm text-gray-500">
            {printersLoading
              ? "Detecting printers..."
              : printersError
                ? ""
                : `${printers.length} printer(s) detected`}
          </span>
          <button
            onClick={() => detectPrinters()}
            disabled={printersLoading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-black transition text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            <RefreshCw size={16} className={printersLoading ? "animate-spin" : ""} />
            {printersLoading ? "Detecting..." : "Refresh Printers"}
          </button>
        </div>

        <button
          onClick={handleSavePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition text-white px-4 py-2 rounded-lg"
        >
          <Save size={16} /> Save Print Settings
        </button>

        <p className="text-xs text-gray-400 mt-3">
          Printers are read live from this computer through the QZ Tray desktop
          app. While this page is open the connection is established
          automatically — as soon as QZ Tray is running, available printers
          appear in the dropdowns above.
        </p>
      </div>

      {/* DAILY NOTES */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <StickyNote size={18} className="text-blue-500" /> Daily Notes
        </h3>

        <textarea
          className="w-full border rounded-lg p-3 mb-3"
          rows="3"
          placeholder="Write today's note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded-lg"
        >
          <Save size={16} />
          {editId ? "Update Note" : "Add Note"}
        </button>
      </div>

      {/* NOTES LIST */}
      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No notes yet</p>
        )}

        {notes.map((n) => (
          <div
            key={n.id}
            className="bg-white border rounded-lg p-3 flex justify-between items-center gap-3 hover:shadow-sm transition"
          >
            <p className="text-sm break-words">{n.note}</p>

            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => handleEdit(n)}
                className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <Pencil size={14} /> Edit
              </button>

              <button
                onClick={() => handleDelete(n.id)}
                className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
