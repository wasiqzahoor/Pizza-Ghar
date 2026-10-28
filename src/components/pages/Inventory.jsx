"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Plus, Edit, Trash2, Filter } from "lucide-react";
import useAuthCheck from "@/hooks/useAuthCheck";
import Pagination from "@/components/Pagination";
import { showAlert, showConfirm } from "@/utils/popup";

export default function Inventory() {
  useAuthCheck();

  /* ================= STATES ================= */

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "",
    threshold: "",
    supplier: "",
  });

  /* ================= ROLE ================= */

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isChef = role === "chef";

  /* ================= LOAD INVENTORY ================= */

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(
      () => loadInventory(page, search),
      search ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [page, search]);

  const loadInventory = async (pageArg, qArg) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const params = new URLSearchParams();
      params.set("page", pageArg ?? page);
      const qq = (qArg ?? search).trim();
      if (qq) params.set("q", qq);

      const res = await axios.get(
        `${API_BASE}/api/inventory?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setItems(Array.isArray(res.data?.rows) ? res.data.rows : []);
      setPagination({
        pages: res.data?.pages || 1,
        total: res.data?.total || 0,
      });
    } catch (err) {
      console.log("Load error", err);
    }
  };

  /* ================= FILTER (server-driven) ================= */

  const filteredItems = items;

  /* ================= ADD / UPDATE ================= */

  const saveItem = async () => {
    if (isChef) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      if (editingId) {
        await axios.put(
          `${API_BASE}/api/inventory/${editingId}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_BASE}/api/inventory`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setShowModal(false);
      setEditingId(null);
      setForm({
        name: "",
        category: "",
        stock: "",
        threshold: "",
        supplier: "",
      });
      showAlert("Item saved successfully", "success");
      loadInventory();

    } catch {
      showAlert("Save failed", "error");
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (isChef) return;

    if (!(await showConfirm("Delete this inventory item?", { danger: true })))
      return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        `${API_BASE}/api/inventory/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showAlert("Item deleted", "success");
      loadInventory();

    } catch {
      showAlert("Delete failed", "error");
    }
  };

  /* ================= EDIT ================= */

  const handleEdit = (item) => {
    if (isChef) return;

    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      stock: item.stock,
      threshold: item.threshold,
      supplier: item.supplier,
    });
    setShowModal(true);
  };

  const getStatus = (stock, threshold) =>
    stock <= threshold ? "Low Stock" : "In Stock";

  /* ================= UI ================= */

  return (
    <div className="p-4 md:p-8 bg-[#f4f6f9] min-h-full">

      {/* ===== Header ===== */}
      <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Inventory Management
            </h1>
            <p className="text-gray-500 mt-2">
              Track stock levels and suppliers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-gray-100 rounded-xl px-4 py-2 flex-1 min-w-[150px] lg:flex-none">
              <Search size={18} className="shrink-0" />
              <input
                type="text"
                placeholder="Search inventory..."
                className="ml-2 bg-transparent outline-none w-full min-w-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl shrink-0">
              <Filter size={16} /> Filter
            </button>

            {/* 🔒 Add disabled for Chef */}
            {!isChef && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    name: "",
                    category: "",
                    stock: "",
                    threshold: "",
                    supplier: "",
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-xl shrink-0"
              >
                <Plus size={16} /> Add Item
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div className="bg-white rounded-3xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
            <tr>
              <th className="px-6 py-4">Item Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Supplier</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredItems.map(item => {
              const status = getStatus(item.stock, item.threshold);

              return (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-5">{item.name}</td>
                  <td className="px-6 py-5">{item.category}</td>
                  <td className="px-6 py-5">{item.stock}</td>

                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status === "Low Stock"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {status}
                    </span>
                  </td>

                  <td className="px-6 py-5">{item.supplier}</td>

                  {/* 🔒 Disabled icons for Chef */}
                  <td className="px-6 py-5 text-right flex justify-end gap-4">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={isChef}
                      className={isChef ? "opacity-30 cursor-not-allowed" : ""}
                    >
                      <Edit size={18} />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isChef}
                      className={isChef ? "opacity-30 cursor-not-allowed" : ""}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="px-6">
          <Pagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            onChange={setPage}
            label="items"
          />
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {showModal && !isChef && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[92%] max-w-md">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "Edit Item" : "Add Item"}
            </h2>

            {Object.keys(form).map(key => (
              <input
                key={key}
                placeholder={key.toUpperCase()}
                className="w-full border rounded p-2 mb-3"
                value={form[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: e.target.value })
                }
              />
            ))}

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveItem}
                className="flex-1 bg-red-500 text-white py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
