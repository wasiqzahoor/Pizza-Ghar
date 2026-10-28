"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import useAuthCheck from "@/hooks/useAuthCheck";
import { showAlert } from "@/utils/popup";
import { printAndClose } from "@/utils/printWindow";
import { imgUrl } from "@/lib/img";

import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
} from "lucide-react";

export default function POS() {
  useAuthCheck();

  /* ================= STATES ================= */

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("Dine In");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [billStatus, setBillStatus] = useState("paid");

  // new stats
  const [cashReceived, setCashReceived] = useState("");
  const [cashBack, setCashBack] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  /* 🔹 ADDED (NO UI CHANGE) */
  const [tableNo, setTableNo] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");

  const receiptRef = useRef(null);

  const [orderDescription, setOrderDescription] = useState("");

  const API = `${API_BASE}/api`;

  /* ================= LOAD PRODUCTS ================= */

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => loadProducts(search, selectedCategory),
      search ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [search, selectedCategory]);

  const loadProducts = async (qq = "", cat = "All") => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const params = new URLSearchParams();
      params.set("limit", "500");
      if (qq && qq.trim()) params.set("q", qq.trim());
      if (cat && cat !== "All") params.set("category", cat);

      const res = await axios.get(
        `${API}/products?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMenuItems(Array.isArray(res.data?.rows) ? res.data.rows : []);
    } catch {
      setMenuItems([]);
    }
  };

  const loadCategories = async () => {

    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(["All", ...new Set(res.data.map(c => c.name))]);
    } catch {
      setCategories(["All"]);
    }
  };

  /* ================= CART ================= */

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c =>
        c.id === item.id ? { ...c, qty: c.qty + 1 } : c
      ));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const increaseQty = (id) =>
    setCart(cart.map(c =>
      c.id === id ? { ...c, qty: c.qty + 1 } : c
    ));

  const decreaseQty = (id) =>
    setCart(
      cart
        .map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
        .filter(c => c.qty > 0)
    );

  const removeItem = (id) =>
    setCart(cart.filter(c => c.id !== id));

  /* ================= TOTAL ================= */

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );

  const total = subtotal;

  /* ================= SAVE ORDER ================= */

  const saveOrder = async () => {
    try {
      if (cart.length === 0) {
        showAlert("Cart is empty", "warning");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showAlert("Please login first", "warning");
        return;
      }

      const receiptSnapshot = {
        customerName: customerName || "Walk-in",
        orderType,
        paymentMethod,
        billStatus,
        tableNo,
        customerPhone,
        address,
        orderDescription,

        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          qty: Number(item.qty),
        })),
        // ✅ NEW FIELDS
        cashReceived: Number(cashReceived) || 0,
        cashBack,
        dueAmount,
        subtotal,
        total,
        date: new Date().toLocaleString(),
      };

      receiptRef.current = receiptSnapshot;

      const res = await axios.post(
        `${API}/orders`,
        receiptSnapshot,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // ✅ BACKEND RETURNS INSERTED ORDER ID
      const orderId = res.data?.orderId || res.data?.id;

      receiptRef.current = {
        ...receiptSnapshot,
        invoiceNo: orderId   // ✅ STORE INVOICE NUMBER
      };
      setShowBill(true);

      setCart([]);
setCustomerName("");
setTableNo("");
setCustomerPhone("");
setAddress("");
setOrderDescription("");
setCashReceived("");
setCashBack(0);
setDueAmount(0);

setBillStatus("paid");
setPaymentMethod("Cash");
setOrderType("Dine In");

    } catch (error) {
      console.log(error);
      showAlert("Inventory Not Available", "error");
    }
  };

  useEffect(() => {
    const received = Number(cashReceived) || 0;

    if (received >= total) {
      setCashBack(received - total);
      setDueAmount(0);
      setBillStatus("paid");   // ✅ AUTO PAID

    } else {
      setCashBack(0);
      setDueAmount(total - received);
      setBillStatus("unpaid");   // ✅ AUTO PAID

    }
  }, [cashReceived, total]);

  /* ================= PRINT ================= */

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
  ${data.orderDescription ? `<div>Description: ${data.orderDescription}</div>` : ""}

  ${data.tableNo ? `<div>Table: ${data.tableNo}</div>` : ""}

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

    // ✅ print runs inside the popup — main app never freezes
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

    // ✅ print runs inside the popup — main app never freezes
    printAndClose(win, () => setIsPrinting(false));
  };

  /* ================= FILTER ================= */

  const filteredItems = menuItems.filter(item =>
    (selectedCategory === "All" || item.category === selectedCategory)
    && item.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= UI ================= */

  return (
    <div className="flex flex-col lg:flex-row min-h-full lg:h-full bg-gray-100">

      {/* LEFT */}
      <div className="flex-1 p-4 md:p-6 min-h-0 lg:overflow-y-auto">

        <h1 className="text-2xl font-bold mb-4">POS</h1>

        <div className="flex items-center bg-white rounded-xl px-4 py-2 mb-4 shadow">
          <Search size={18} />
          <input
            placeholder="Search menu items..."
            className="ml-2 outline-none w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm ${selectedCategory === cat
                ? "bg-orange-500 text-white"
                : "bg-white shadow"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="relative group bg-white rounded-xl shadow cursor-pointer overflow-hidden"
            >
              <img
                src={item.image ? imgUrl(item.image) : "/no-image.png"}
                className="h-40 w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                <div className="bg-orange-500 p-4 rounded-full text-white">
                  <Plus size={28} />
                </div>
              </div>
              <div className="p-4">
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-red-500 font-bold">Rs {item.price}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* RIGHT */}
      <div className="w-full lg:w-96 bg-white shadow-lg p-4 md:p-6 flex flex-col">

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShoppingCart size={20} />
          Current Order
        </h2>

        <input
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="border rounded-lg px-3 py-2 mb-2 shrink-0"
        />

        {orderType === "Dine In" && (
          <input
            placeholder="Table Number"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
            className="border rounded-lg px-3 py-2 mb-2 shrink-0"
          />
        )}

        {orderType !== "Dine In" && (
          <input
            placeholder="Customer Phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="border rounded-lg px-3 py-2 mb-2 shrink-0"
          />
        )}

        {orderType === "Delivery" && (
          <textarea
            placeholder="Delivery Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border rounded-lg px-3 py-2 mb-2 h-16 shrink-0 resize-none"
          />
        )}

        <textarea
  placeholder="Order Description (optional)"
  value={orderDescription}
  onChange={(e) => setOrderDescription(e.target.value)}
  className="border rounded-lg px-3 py-2 mb-2 h-20 shrink-0 resize-none"
 />

        {/* ORDER TYPE */}
        <div className="mb-4 grid grid-cols-3 gap-2 shrink-0">
          {["Dine In", "Take Away", "Delivery"].map(type => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`py-2 rounded-lg border text-sm ${orderType === type
                ? "bg-orange-500 text-white"
                : "bg-white"
                }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* CART */}
        <div className="flex-1 overflow-y-auto">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between mb-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">
                  Rs {item.price} x {item.qty}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => decreaseQty(item.id)}><Minus size={14} /></button>
                <button onClick={() => increaseQty(item.id)}><Plus size={14} /></button>
                <button onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs {subtotal}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>Rs {total.toFixed(0)}</span>
          </div>
        </div>

        {/* BILL STATUS */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["paid", "unpaid"].map(status => (
            <button
              key={status}
              onClick={() => setBillStatus(status)}
              className={`py-2 rounded-lg border text-sm ${billStatus === status
                ? "bg-blue-500 text-white"
                : "bg-white"
                }`}
            >
              {status === "paid" ? "Bill Paid" : "Bill Unpaid"}
            </button>

          ))}

          {(billStatus === "paid" || billStatus === "unpaid") && (
            <div className="mt-3">

              <input
                type="number"
                placeholder="Cash Received"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />

              <div className="mt-2 text-sm">
                <p>Cash Back: {cashBack}</p>
                <p>Due Amount: {dueAmount}</p>
              </div>

            </div>
          )}

        </div>

        {/* PAYMENT */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["Cash", "Card", "Jazz", "Easy"].map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`py-2 rounded-lg border text-sm ${paymentMethod === method
                ? "bg-orange-500 text-white"
                : "bg-white"
                }`}
            >
              {method}
            </button>
          ))}
        </div>

        <button
          onClick={saveOrder}
          className="mt-6 bg-orange-500 text-white py-3 rounded-xl"
        >
          Charge Rs {total.toFixed(0)}
        </button>

      </div>

      {/* ================= BILL MODAL ================= */}

      {showBill && receiptRef.current && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-xl w-80">

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

                <span>
                  {item.name} x {item.qty}
                </span>

                <span>
                  Rs {item.price * item.qty}
                </span>

              </div>

            ))}

            <hr className="my-3" />

            <div className="flex justify-between font-bold">

              <span>Total</span>

              <span>
                Rs {receiptRef.current.total.toFixed(0)}
              </span>

            </div>

            <div className="flex gap-2 mt-4">

              <button
                onClick={printThermalReceipt}
                disabled={isPrinting}
                className={`flex-1 py-2 rounded ${isPrinting ? "bg-gray-400" : "bg-green-500 text-white"
                  }`}
              >
                Print Bill
              </button>

              <button
                onClick={printKitchenSlip}
                disabled={isPrinting}
                className={`flex-1 py-2 rounded ${isPrinting ? "bg-gray-400" : "bg-yellow-500 text-white"
                  }`}
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
