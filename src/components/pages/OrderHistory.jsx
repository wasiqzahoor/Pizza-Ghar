"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import useAuthCheck from "@/hooks/useAuthCheck";
import Pagination from "@/components/Pagination";
import { Search, Eye, RotateCcw, X } from "lucide-react";
import { showAlert, showConfirm } from "@/utils/popup";
import { formatListDate, formatListTime } from "@/lib/dates";

export default function OrderHistory({ initialOrders = null }) {
  useAuthCheck(["admin"]);

  const API = `${API_BASE}/api`;

  const [orders, setOrders] = useState(() => initialOrders?.rows || []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    pages: initialOrders?.pages || 1,
    total: initialOrders?.total || 0,
  });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  /* ================= LOAD DELETED ORDERS ================= */

  const loadOrders = async (pageArg, qArg) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      params.set("page", pageArg ?? page);
      params.set("deleted", "1");
      const qq = (qArg ?? search).trim();
      if (qq) params.set("q", qq);

      const res = await axios.get(`${API}/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrders(Array.isArray(res.data.rows) ? res.data.rows : []);
      setPagination({
        pages: res.data.pages || 1,
        total: res.data.total || 0
      });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  const didInitialLoad = useRef(!initialOrders);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      return;
    }
    const t = setTimeout(
      () => loadOrders(page, search),
      search ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [page, search]);

  /* ================= VIEW ITEMS ================= */

  const handleView = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelected(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= RESTORE ================= */

  const handleRestore = async (id) => {
    if (
      !(await showConfirm("Restore this order back to Orders list?", {
        title: "Restore order",
      }))
    )
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/orders/${id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert("Order restored successfully", "success");
      loadOrders();
    } catch {
      showAlert("Restore failed", "error");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-full">

      <h1 className="text-2xl font-bold mb-1">Order History</h1>
      <p className="text-gray-500 text-sm mb-6">
        Deleted orders — restore brings an order back to the Orders list
      </p>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">

        {/* SEARCH */}
        <div className="relative w-full md:w-80 mb-6">
          <Search size={16} className="absolute top-3 left-3 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full"
            placeholder="Search by customer, phone or order id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full min-w-175 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left">ORDER ID</th>
                <th className="p-4 text-left">TYPE</th>
                <th className="p-4 text-left">CUSTOMER</th>
                <th className="p-4 text-left">ORDER DATE</th>
                <th className="p-4 text-left">TOTAL</th>
                <th className="p-4 text-left">DELETED AT</th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No deleted orders
                  </td>
                </tr>
              )}

              {orders.map((o) => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-semibold">#{o.id}</td>
                  <td className="p-4">{o.order_type}</td>
                  <td className="p-4">{o.customer_name}</td>
                  <td className="p-4">
                    {formatListDate(new Date(o.created_at))}
                    <br />
                    <span className="text-xs text-gray-400">
                      {formatListTime(new Date(o.created_at))}
                    </span>
                  </td>
                  <td className="p-4 font-semibold">Rs {o.total}</td>
                  <td className="p-4 text-red-500">
                    {o.deleted_at
                      ? `${formatListDate(new Date(o.deleted_at))} ${formatListTime(new Date(o.deleted_at))}`
                      : "-"}
                  </td>
                  <td className="p-4 flex gap-3 justify-center">
                    <button
                      onClick={() => handleView(o.id)}
                      title="View items"
                      className="cursor-pointer"
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => handleRestore(o.id)}
                      title="Restore order"
                      className="cursor-pointer text-green-600"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pages={pagination.pages}
          total={pagination.total}
          onChange={setPage}
          label="deleted orders"
        />
      </div>

      {/* VIEW ITEMS MODAL */}
      {selected && (
        <div className="fixed right-5 top-5 bg-white border shadow-lg p-4 w-[92%] sm:w-80 max-w-sm rounded z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Order #{selected.id}</h3>
            <X
              size={18}
              className="cursor-pointer"
              onClick={() => setSelected(null)}
            />
          </div>

          <div className="text-xs text-gray-500 mb-2">
            {selected.customerName || "-"} &middot; {selected.orderType || "-"}
          </div>

          {selected.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} x{item.qty}</span>
              <span>Rs {item.total}</span>
            </div>
          ))}

          <div className="mt-3 text-right font-bold">
            Total: Rs {selected.total}
          </div>

          <button
            className="mt-3 bg-red-500 text-white px-3 py-1 rounded"
            onClick={() => setSelected(null)}
          >
            Close
          </button>
        </div>
      )}

    </div>
  );
}
