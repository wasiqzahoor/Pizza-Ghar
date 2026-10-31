"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  Edit3,
  Printer,
  Phone
} from "lucide-react";
import axios from "axios";

import useAuthCheck from "@/hooks/useAuthCheck";
import Pagination from "@/components/Pagination";
import { showAlert, showConfirm } from "@/utils/popup";
import { printAndClose } from "@/utils/printWindow";
import { formatListDate, formatListTime } from "@/lib/dates";

const formatOrderRows = (rows) =>
  rows.map((order) => {
    const d = new Date(order.created_at);
    return {
      id: order.id,
      type: order.order_type,
      customer: order.customer_name,
      billStatus: order.bill_status || "paid",
      date: formatListDate(d),
      time: formatListTime(d),
      items: order.items,
      total: order.total,
      dueAmount: order.due_amount || 0,
      status: order.status || "completed",
      address: order.delivery_address || "",
      customerPhone: order.customer_phone || "",
    };
  });

export default function Orders({ initialOrders = null }) {
  useAuthCheck(["admin", "cashier"]);

  const router = useRouter();

  const [role, setRole] = useState(null);
  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);
  const isChef = role === "chef";
  const isCashier = role === "cashier";
  const isAdmin = role == "admin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ordersData, setOrdersData] = useState(() =>
    initialOrders?.rows ? formatOrderRows(initialOrders.rows) : []
  );
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billFilter, setBillFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    pages: initialOrders?.pages || 1,
    total: initialOrders?.total || 0,
  });
  const [loading, setLoading] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [editBillStatus, setEditBillStatus] = useState("paid");
  const [editDue, setEditDue] = useState(0);

  const receiptRef = useRef(null);
  const [showBill, setShowBill] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const didInitialLoad = useRef(!initialOrders);

  const API = `${API_BASE}/api`;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, billFilter]);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      return;
    }
    const t = setTimeout(() => loadOrders(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [page, search, statusFilter, billFilter]);

  const handleModify = (id) => {
    const role = localStorage.getItem("role");

    if (role === "admin") {
      router.push(`/admin/editpos/${id}`);
    } else if (role === "cashier") {
      router.push(`/cashier/editpos/${id}`);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      params.set("page", page);
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (billFilter !== "all") params.set("billStatus", billFilter);

      const res = await axios.get(
        `${API}/orders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setOrdersData(formatOrderRows(res.data.rows));
      setPagination({ pages: res.data.pages, total: res.data.total });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${API}/orders/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSelectedOrder(res.data);
      setShowModal(true);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await showConfirm("Delete this order? It will move to Order History.", {
        title: "Delete order",
        danger: true,
      }))
    )
      return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API}/orders/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      showAlert("Order deleted (moved to Order History)", "success");
      loadOrders();
    } catch (err) {
      console.log(err);
      showAlert("Delete failed", "error");
    }
  };

  const handleEdit = (order) => {
    setEditBill(order);
    setEditBillStatus(
      order.billStatus === "paid" || order.billStatus === "unpaid"
        ? order.billStatus
        : "unpaid"
    );
    setEditDue(Number(order.dueAmount) || 0);
  };

  const saveBill = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API}/orders/${editBill.id}/bill`,
        {
          billStatus: editBillStatus,
          dueAmount: Number(editDue) || 0
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      showAlert("Bill updated successfully", "success");
      setEditBill(null);
      loadOrders();
    } catch (err) {
      console.log(err);
      showAlert("Bill update failed", "error");
    }
  };

  const handlePrint = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${API}/orders/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data;

      receiptRef.current = {
        invoiceNo: data.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone || "",
        address: data.address || "",
        orderDescription: data.orderDescription || "",

        orderType: data.orderType,
        paymentMethod: data.paymentMethod,
        billStatus: data.billStatus,
        items: data.items,
        subtotal: data.subtotal,
        total: data.total,
        cashReceived: data.cashReceived,
        cashBack: data.cashBack,
        dueAmount: data.dueAmount,
        date: new Date(data.created_at).toLocaleString()
      };

      setShowBill(true);

    } catch (err) {
      console.log(err);
    }
  };

  const printThermalReceipt = () => {
    if (isPrinting) return;
    setIsPrinting(true);

    const data = receiptRef.current;
    if (!data) {
      setIsPrinting(false);
      return;
    }

    const totalQty = data.items.reduce((a, b) => a + b.qty, 0);
    const totalItems = data.items.length;

    const win = window.open("", "_blank", "width=320,height=700");

    if (!win) {
      showAlert("Popup blocked! Please allow popups.", "warning");
      setIsPrinting(false);
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>PizzaGhar Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 80mm;
      font-family: monospace;
      padding: 8px;
      font-size: 12px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 2px 0;
    }
    th {
      border-bottom: 1px solid #000;
    }
    .right { text-align: right; }
    .total { font-weight: bold; font-size: 14px; }
    .small { font-size: 11px; }
    img.logo {
      max-width: 70mm;
      margin-bottom: 6px;
    }
  </style>
</head>

<body>

  <div class="center">
    <img src="/logo.jpeg" class="logo" alt="Pizza Ghar Logo" />
  </div>

  <div class="center bold">PIZZA GHAR</div>
  <div class="center small">Orders @ 0330-5278777</div>

  <div class="line"></div>

  <div>Date: ${data.date}</div>
  <div>Invoice: ${data.invoiceNo}</div>
  <div>Customer: ${data.customerName || "Walk-in"}</div>

  ${data.customerPhone ? `<div>Cell #: ${data.customerPhone}</div>` : ""}
  ${data.address ? `<div>Address: ${data.address}</div>` : ""}

  ${data.tableNo ? `<div>Table: ${data.tableNo}</div>` : ""}

  ${data.orderDescription ? `
  <div>Description: ${data.orderDescription}</div>
` : ""}

  <div class="line"></div>

  <div>
    ST: ${data.orderType.toUpperCase()}
    &nbsp;&nbsp;
    PM: ${data.paymentMethod}
  </div>

  <div class="line"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="right">Price</th>
        <th class="right">Qty</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td class="right">${item.price}</td>
          <td class="right">${item.qty}</td>
          <td class="right">${item.price * item.qty}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="line"></div>

  <table>
    <tr>
      <td>Sub Total</td>
      <td class="right">${data.subtotal}</td>
    </tr>
    <tr class="total">
      <td>Net Total</td>
      <td class="right">${Math.round(data.total)}</td>
    </tr>
  </table>

  <div>Total QTY: ${totalQty}</div>
  <div>Total Items: ${totalItems}</div>

  <table>
    <tr>
      <td>Cash Received</td>
      <td class="right">${data.cashReceived || 0}</td>
    </tr>
    <tr>
      <td>Cash Back</td>
      <td class="right">${data.cashBack || 0}</td>
    </tr>
    <tr>
      <td>Due Amount</td>
      <td class="right">${data.dueAmount || 0}</td>
    </tr>
  </table>

  <div class="line"></div>

  <div class="center bold">
    (*** BILL / ${data.billStatus.toUpperCase()} ***)
  </div>

  <div class="center bold">
    Thank You For Visiting
  </div>

  <div class="line"></div>

  <div class="center small">
    POS Developed by NewAiTechSofts PVT LTD 03415287464
  </div>

</body>
</html>`);

    win.document.close();

    printAndClose(win, () => setIsPrinting(false));
  };

  const printKitchenSlip = async () => {
    if (isPrinting) return;

    const data = receiptRef.current;
    if (!data) return;

    try {
      const res = await fetch(
        `${API}/orders/${data.invoiceNo}/print-kitchen`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (res.status === 409) {
        showAlert(
          "Kitchen receipt already printed for this order. Edit the order to allow reprint.",
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

    setIsPrinting(true);

    const totalQty = data.items.reduce((a, b) => a + b.qty, 0);
    const totalItems = data.items.length;

    const win = window.open("", "_blank", "width=320,height=700");

    if (!win) {
      showAlert("Popup blocked! Please allow popups.", "warning");
      setIsPrinting(false);
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>PizzaGhar Kitchen Slip</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 80mm;
      font-family: monospace;
      padding: 8px;
      font-size: 12px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td { padding: 2px 0; }
    th { border-bottom: 1px solid #000; }
    .right { text-align: right; }
    .small { font-size: 11px; }
    img.logo {
      max-width: 70mm;
      margin-bottom: 6px;
    }
  </style>
</head>

<body>
 <div class="center bold" style="font-size:18px;">
    INVOICE #${data.invoiceNo}
  </div>

  <div class="center bold">( PIZZA GHAR KITCHEN SLIP )</div>

  <div class="line"></div>

  <div>Customer: ${data.customerName || "Walk-in"}</div>
  <div>Type: ${data.orderType}</div>
  ${data.tableNo ? `<div>Table: ${data.tableNo}</div>` : ""}
    <div>Date: ${data.date}</div>

    ${data.orderDescription ? `
  <div>Description: ${data.orderDescription}</div>
` : ""}

  <div class="line"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="right">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
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

  <div class="center bold">
    (*** Preparing : 20 minutes ***)
  </div>

  <div class="center bold">
    Thank You
  </div>

</body>
</html>`);

    win.document.close();

    printAndClose(win, () => setIsPrinting(false));
  };

  const statusBadge = status => {
    if (status === "completed")
      return (
        <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 w-fit whitespace-nowrap">
          <CheckCircle size={12} /> Completed
        </span>
      );

    if (status === "preparing")
      return (
        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 w-fit whitespace-nowrap">
          <Clock size={12} /> Preparing
        </span>
      );

    return (
      <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-[11px] w-fit whitespace-nowrap">
        Ready
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-full">

      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">


          {/* SEARCH */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute top-3 left-3 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* BILL FILTER BUTTONS */}
          <div className="flex gap-2">

            <button
              onClick={() => setBillFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                billFilter === "all"
                  ? "bg-black text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              All
            </button>

            <button
              onClick={() => setBillFilter("paid")}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                billFilter === "paid"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Paid
            </button>

            <button
              onClick={() => setBillFilter("unpaid")}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                billFilter === "unpaid"
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Unpaid
            </button>

          </div>

        </div>

        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[960px] text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Order ID</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Address</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Items</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Due</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Bill</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && ordersData.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">
                    No orders found
                  </td>
                </tr>
              )}

              {ordersData.map(order => (
                <tr key={order.id} className="border-t hover:bg-gray-50">

                  <td className="px-2 py-2 font-semibold whitespace-nowrap">#{order.id}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{order.type}</td>
                  <td
                    className="px-2 py-2 max-w-[95px] truncate"
                    title={order.customer || ""}
                  >
                    {order.customer}
                  </td>

                  <td
                    className="px-2 py-2 max-w-[90px] truncate"
                    title={order.address || ""}
                  >
                    {order.address || "-"}
                  </td>

                  <td className="px-2 py-2 whitespace-nowrap leading-tight">
                    {order.date}
                    <br />
                    <span className="text-[11px] text-gray-400">{order.time}</span>
                  </td>

                  <td className="px-2 py-2 text-center">{order.items}</td>
                  <td className="px-2 py-2 font-semibold whitespace-nowrap">Rs {order.total}</td>
                  <td className="px-2 py-2 font-semibold text-red-500 whitespace-nowrap">
                    Rs {order.dueAmount}
                  </td>

                  <td className="px-2 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${
                      order.billStatus === "paid"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {order.billStatus.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-2 py-2">{statusBadge(order.status)}</td>

                  <td className="px-2 py-2">
                    <div className="flex gap-1.5 justify-center items-center">
                      <Eye
                        size={15}
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => handleView(order.id)}
                      />

                      {(isChef || isCashier || isAdmin) && (
                        <Printer
                          size={15}
                          className="cursor-pointer hover:text-orange-600"
                          onClick={() => handlePrint(order.id)}
                        />
                      )}

                      {(isCashier || isAdmin) && (
                        <Edit
                          size={15}
                          className="cursor-pointer hover:text-green-600"
                          onClick={() => handleEdit(order)}
                        />
                      )}

                      {(isCashier || isAdmin) && (
                        <Edit3
                          size={15}
                          className="cursor-pointer text-blue-600"
                          onClick={() => handleModify(order.id)}
                        />
                      )}

                      {isAdmin && (
                        <Trash2
                          size={15}
                          className="cursor-pointer text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(order.id)}
                        />
                      )}
                    </div>
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
          label="orders"
        />
      </div>

      {showModal && selectedOrder && (
        <div className="fixed right-5 top-5 bg-white border shadow-lg p-4 w-[92%] sm:w-80 max-w-sm rounded z-50">
          <h3 className="font-bold mb-2">
            Order #{selectedOrder.id}
          </h3>

          {selectedOrder.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} x{item.qty}</span>
              <span>Rs {item.total}</span>
            </div>
          ))}

          <div className="mt-3 text-right font-bold">
            Total: Rs {selectedOrder.total}
          </div>

          <button
            className="mt-3 bg-red-500 text-white px-3 py-1 rounded"
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
        </div>
      )}

      {editBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">
              Edit Bill — Order #{editBill.id}
            </h3>

            <label className="block text-sm text-gray-600 mb-1">
              Bill Status
            </label>
            <select
              value={editBillStatus}
              onChange={(e) => setEditBillStatus(e.target.value)}
              className="w-full border rounded p-2 mb-3"
            >
              <option value="paid">paid</option>
              <option value="unpaid">unpaid</option>
            </select>

            <label className="block text-sm text-gray-600 mb-1">
              Due Amount (Rs)
            </label>
            <input
              type="number"
              min="0"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              className="w-full border rounded p-2 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={saveBill}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded transition"
              >
                Save
              </button>
              <button
                onClick={() => setEditBill(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBill && receiptRef.current && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-xl">

            <h2 className="text-center font-bold text-lg">
              Pizza Ghar
            </h2>

            <p className="text-sm mt-2">
              Customer: {receiptRef.current.customerName}
            </p>

            <p className="text-sm">
              Order Type: {receiptRef.current.orderType}
            </p>

            {receiptRef.current.tableNo && (
              <p className="text-sm">
                Table: {receiptRef.current.tableNo}
              </p>
            )}

            {receiptRef.current.customerPhone && (
              <p className="text-sm">
                Phone: {receiptRef.current.customerPhone}
              </p>
            )}

            {receiptRef.current.address && (
              <p className="text-sm">
                Address: {receiptRef.current.address}
              </p>
            )}

            <p className="text-sm">
              Payment: {receiptRef.current.paymentMethod}
            </p>

            <p className="text-sm">
              Status: {receiptRef.current.billStatus.toUpperCase()}
            </p>

            <hr className="my-3" />

            {(receiptRef.current.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name} x {item.qty}</span>
                <span>Rs {item.price * item.qty}</span>
              </div>
            ))}

            <hr className="my-3" />

            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>Rs {receiptRef.current.total}</span>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={printThermalReceipt}
                disabled={isPrinting}
                className="flex-1 bg-green-500 text-white py-2 rounded"
              >
                Print Bill
              </button>

              <button
                onClick={printKitchenSlip}
                disabled={isPrinting}
                className="flex-1 bg-yellow-500 text-white py-2 rounded"
              >
                Kitchen Print
              </button>

              <button
                onClick={() => {
                  setShowBill(false);
                  receiptRef.current = null;
                }}
                className="flex-1 bg-gray-200 py-2 rounded"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
