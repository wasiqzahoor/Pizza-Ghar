"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState, useRef } from "react";
import useAuthCheck from "@/hooks/useAuthCheck";
import {
  Printer,
  CheckCircle,
  Clock
} from "lucide-react";
import axios from "axios";
import Topbar from "@/components/Topbar";
import { showAlert } from "@/utils/popup";
import { printHtml } from "@/utils/printWindow";
import { autoPrintPreflight } from "@/utils/autoPrint";

export default function ChefOrders({ initialOrders = null }) {
   useAuthCheck();

  const [orders, setOrders] = useState(() => initialOrders || []);
  const [search, setSearch] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  const API = `${API_BASE}/api/orders`;

  const fetchOrders = async () => {
    try {
      const res = await axios.get(
        `${API}/kitchen`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      setOrders(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const didInitialLoad = useRef(!initialOrders);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
    } else {
      fetchOrders();
    }
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const markReady = async (id) => {
    try {
      await axios.put(
        `${API}/${id}/ready`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      fetchOrders();
    } catch (err) {
      console.log(err);
    }
  };

  const completeOrder = async (id) => {
    try {
      await axios.put(
        `${API}/${id}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      fetchOrders();
    } catch (err) {
      console.log(err);
    }
  };

  const filteredOrders = orders.filter(order => {
    const q = search.toLowerCase();
    return (
      order.id.toString().includes(q) ||
      order.customer?.toLowerCase().includes(q) ||
      order.items?.some(i =>
        i.name.toLowerCase().includes(q)
      )
    );
  });

const handlePrint = async (order) => {
  if (!order || isPrinting) return;

  /* auto dual-print ON → verify QZ + kitchen printer BEFORE claiming,
     so a failure can never mark the receipt as printed */
  const pre = await autoPrintPreflight("kitchen");
  if (!pre.ok) return;

  /* one kitchen print per order version — server claims it */
  try {
    const res = await fetch(`${API}/${order.id}/print-kitchen`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.status === 409) {
      showAlert(
        "Kitchen receipt already printed for this order. Modify the order to allow reprint.",
        "warning"
      );
      return;
    }
    if (!res.ok) {
      showAlert("Could not print kitchen receipt", "error");
      return;
    }
  } catch {
    showAlert("Could not print kitchen receipt", "error");
    return;
  }

  /* add-on batch: only NEW (unprinted) lines go on this slip */
  const allItems = order.items || [];
  const anyPrinted = allItems.some((i) => i.printed);
  const printItems = anyPrinted
    ? allItems.filter((i) => !i.printed)
    : allItems;

  const totalQty = printItems.reduce((a, b) => a + b.qty, 0);
  const totalItems = printItems.length;

  setIsPrinting(true);

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>PizzaGhar Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 80mm;
      box-sizing: border-box;
      font-family: monospace;
      padding: 8px;
      overflow-wrap: anywhere;
      font-size: 13px;
      font-weight: bold;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 2px dashed #000; margin: 6px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    table.items { table-layout: fixed; }
    table.items th:nth-child(1), table.items td:nth-child(1) { width: 78%; overflow-wrap: anywhere; }
    table.items th:nth-child(2), table.items td:nth-child(2) { width: 22%; }
    th, td { padding: 2px 0; }
    th { border-bottom: 2px solid #000; font-size: 14px; }
    .right { text-align: right; }
    .small { font-size: 12px; }
    img.logo {
      max-width: 70mm;
      margin-bottom: 6px;
    }
  </style>
</head>

<body>

 <div class="center bold" style="font-size:20px;">
    INVOICE #${order.id}
  </div>

  <div class="center bold" style="font-size:16px;">( PIZZA GHAR KITCHEN SLIP )</div>

  <div class="line"></div>
<div>Date: ${order.date || ""}</div>
<div>Time: ${order.time || ""}</div>
<div>Customer: ${order.customer || "Walk-in"}</div>
<div>Type: ${order.type}</div>
${order.description ? `<div class="bold">NOTE: ${order.description}</div>` : ""}

  <div class="line"></div>

  <table class="items">
    <thead>
      <tr>
        <th>Item</th>
        <th class="right">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${printItems.map(item => `
        <tr>
          <td>${item.name}</td>
          <td class="right">${item.qty}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="line"></div>

  <div>Total QTY: ${totalQty}</div>
  <div>Total Items: ${totalItems}</div>

  <div class="line"></div>

  <div class="center bold" style="font-size:17px;">
    (*** ${order.status?.toUpperCase()}  : 20 minutes ***)
  </div>

  <div class="center bold" style="font-size:15px;">
    Thank You
  </div>

</body>
</html>`;

  printHtml(html, () => setIsPrinting(false), "kitchen");
};

  return (
    <>
      <Topbar />

      <div className="p-4 md:p-8 bg-gray-100 min-h-full">

        <h1 className="text-2xl font-bold mb-4">
          Chef Orders (Table View)
        </h1>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search order / customer / item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm w-full sm:w-72"
          />
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto max-h-[70vh]">

          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-left">ORDER</th>
                <th className="p-4 text-left">TYPE</th>
                <th className="p-4 text-left">CUSTOMER</th>
                <th className="p-4 text-left">DATE</th>

                <th className="p-4 text-left">TIME</th>

                <th className="p-4 text-left">ITEMS</th>
                <th className="p-4 text-left">STATUS</th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-t hover:bg-gray-50">

                  <td className="p-4 font-semibold">
                    #{order.id}
                  </td>

                  <td className="p-4">{order.type}</td>

                  <td className="p-4">{order.customer}</td>

                  <td className="p-4">
  {order.date || "N/A"}
</td>

<td className="p-4 flex items-center gap-1">
  <Clock size={14} /> {order.time || "N/A"}
</td>

                  <td className="p-4">
                    {order.items?.map((i, idx) => (
                      <div key={idx}>
                        {i.qty}x {i.name}
                      </div>
                    ))}
                  </td>

                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      order.status === "preparing"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-green-100 text-green-600"
                    }`}>
                      {order.status}
                    </span>
                  </td>

                  <td className="p-4 flex gap-3 justify-center">

                    <Printer
                      size={18}
                      className={`cursor-pointer ${
                        isPrinting ? "opacity-40 pointer-events-none" : ""
                      }`}
                      onClick={() => handlePrint(order)}
                    />

                    {order.status === "preparing" ? (
                      <CheckCircle
                        size={18}
                        className="cursor-pointer text-green-600"
                        onClick={() => markReady(order.id)}
                      />
                    ) : (
                      <CheckCircle
                        size={18}
                        className="cursor-pointer text-gray-600"
                        onClick={() => completeOrder(order.id)}
                      />
                    )}

                  </td>

                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </>
  );
}
