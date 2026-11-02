"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useAuthCheck from "@/hooks/useAuthCheck";
import { KeyRound, History, StickyNote, Save, Pencil, Trash2, Printer } from "lucide-react";
import { showAlert, showConfirm } from "@/utils/popup";

export default function AdminSettings({ initialNotes = null, initialPrint = null }) {
  useAuthCheck();

  const router = useRouter();

  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(() => initialNotes || []);
  const [editId, setEditId] = useState(null);

  /* Automatic Dual Printer Printing (QZ Tray) */
  const [autoPrint, setAutoPrint] = useState(() => !!initialPrint?.autoDualPrint);
  const [billPrinter, setBillPrinter] = useState(
    initialPrint?.billPrinter || "Black Copper"
  );
  const [kitchenPrinter, setKitchenPrinter] = useState(
    initialPrint?.kitchenPrinter || "POS 80X"
  );

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
      if (!res.ok) return;
      const data = await res.json();
      setAutoPrint(!!data.autoDualPrint);
      setBillPrinter(data.billPrinter || "Black Copper");
      setKitchenPrinter(data.kitchenPrinter || "POS 80X");
    } catch {
      /* keep current values */
    }
  };

  const didInitialLoad = useRef(!initialNotes);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      return;
    }
    fetchNotes();
  }, []);

  useEffect(() => {
    if (!initialPrint) fetchPrintSettings();
  }, []);

  const handleSavePrint = async () => {
    if (autoPrint && !billPrinter.trim()) {
      return showAlert("Enter the customer bill printer name", "warning");
    }
    if (autoPrint && !kitchenPrinter.trim()) {
      return showAlert("Enter the kitchen receipt printer name", "warning");
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          autoDualPrint: autoPrint,
          billPrinter: billPrinter.trim(),
          kitchenPrinter: kitchenPrinter.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return showAlert(data.error || "Could not save print settings", "error");
      }

      showAlert(
        autoPrint
          ? "Auto printing ON — receipts now print to the assigned printers"
          : "Auto printing OFF — browser print dialog will be used",
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

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Customer Bill Printer
            </label>
            <input
              type="text"
              value={billPrinter}
              onChange={(e) => setBillPrinter(e.target.value)}
              placeholder="Black Copper"
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Kitchen Receipt Printer
            </label>
            <input
              type="text"
              value={kitchenPrinter}
              onChange={(e) => setKitchenPrinter(e.target.value)}
              placeholder="POS 80X"
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleSavePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition text-white px-4 py-2 rounded-lg"
        >
          <Save size={16} /> Save Print Settings
        </button>

        <p className="text-xs text-gray-400 mt-3">
          Requires the QZ Tray desktop app to be installed and running on this
          computer. On first use QZ Tray asks for permission to connect.
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
