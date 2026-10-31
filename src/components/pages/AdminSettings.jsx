"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useAuthCheck from "@/hooks/useAuthCheck";
import { KeyRound, History, StickyNote, Save, Pencil, Trash2 } from "lucide-react";
import { showAlert, showConfirm } from "@/utils/popup";

export default function AdminSettings({ initialNotes = null }) {
  useAuthCheck();

  const router = useRouter();

  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(() => initialNotes || []);
  const [editId, setEditId] = useState(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/daily-notes`);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
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
