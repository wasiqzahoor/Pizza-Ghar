"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect, useRef } from "react";
import useAuthCheck from "@/hooks/useAuthCheck";
import { useParams } from "next/navigation";

import axios from "axios";
import {
  Search,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { showAlert } from "@/utils/popup";
import { printHtml } from "@/utils/printWindow";
import { autoPrintPreflight } from "@/utils/autoPrint";

export default function EditPOS({
  initialOrder = null,
  initialProducts = null,
  initialCategories = null,
}) {

  useAuthCheck();

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  const [menuItems, setMenuItems] = useState(() =>
    Array.isArray(initialProducts?.rows) ? initialProducts.rows : []
  );
  const [categories, setCategories] = useState(() =>
    initialCategories?.length
      ? ["All", ...new Set(initialCategories.map((c) => c.name))]
      : ["All"]
  );
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);

  const [orderId, setOrderId] = useState(""); // ✅ NEW
  const [loadedOrderId, setLoadedOrderId] = useState(null);

  const [orderType, setOrderType] = useState("Dine In");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [billStatus, setBillStatus] = useState("paid");

  const [cashReceived, setCashReceived] = useState("");
  const [cashBack, setCashBack] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);

  const [tableNo, setTableNo] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orderDescription, setOrderDescription] = useState("");
  const [showPhoneField, setShowPhoneField] = useState(false);
  const [showAddressField, setShowAddressField] = useState(false);

  const [showBill, setShowBill] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef(null);

  const { id } = useParams();

  const API = `${API_BASE}/api`;

  /* Skip the mount-time fetches when the server already seeded the data. */
  const seededOrder = useRef(initialOrder != null);
  const seededProducts = useRef(initialProducts != null);
  const seededCategories = useRef(initialCategories != null);

  useEffect(() => {
    if (id) {
      setOrderId(id);
      if (seededOrder.current) {
        seededOrder.current = false;
        applyOrder(initialOrder);
      } else {
        loadOrder(id);
      }
    }
  }, [id]);

  /* ================= LOAD PRODUCTS ================= */

  useEffect(() => {
    if (seededCategories.current) {
      seededCategories.current = false;
      return;
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (seededProducts.current) {
      seededProducts.current = false;
      return;
    }
    const t = setTimeout(
      () => loadProducts(search, selectedCategory),
      search ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [search, selectedCategory]);

  const loadProducts = async (qq = "", cat = "All") => {
    const params = new URLSearchParams();
    params.set("limit", "500");
    if (qq && qq.trim()) params.set("q", qq.trim());
    if (cat && cat !== "All") params.set("category", cat);

    const res = await axios.get(`${API}/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setMenuItems(Array.isArray(res.data?.rows) ? res.data.rows : []);
  };

  const loadCategories = async () => {
    const res = await axios.get(`${API}/categories`);
    setCategories(["All", ...new Set(res.data.map(c => c.name))]);
  };

  /* ================= LOAD EXISTING ORDER ================= */

  const applyOrder = (data) => {
    setLoadedOrderId(data.id);
    setCustomerName(data.customerName);
    setOrderType(data.orderType);
    setPaymentMethod(data.paymentMethod);
    setBillStatus(data.billStatus);

    const phone = data.customerPhone || data.customer_phone || "";
    const addr = data.address || data.delivery_address || "";

    setCustomerPhone(phone);
    setAddress(addr);
    setOrderDescription(data.orderDescription || "");

    setShowPhoneField(!!phone);
    setShowAddressField(!!addr);

    setCart(
      (data.items || []).map(i => ({
        id: i.id || Math.random(),
        name: i.name,
        price: Number(i.price),
        qty: Number(i.qty)
      }))
    );
  };

  const loadOrder = async (idParam) => {
    const idToUse =
      (typeof idParam === "object" ? idParam?.id : idParam) || orderId;

    if (!idToUse) {
      showAlert("Enter Order ID", "warning");
      return;
    }

    try {
      const res = await axios.get(`${API}/orders/${idToUse}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      applyOrder(res.data);

    } catch (err) {
      console.log(err);
      showAlert("Order not found", "error");
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
    setCart(cart
      .map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
      .filter(c => c.qty > 0)
    );

  const removeItem = (id) =>
    setCart(cart.filter(c => c.id !== id));

  /* ================= TOTAL ================= */

  const subtotal = cart.reduce((a, b) => a + b.price * b.qty, 0);
  const total = subtotal;

  /* ================= AUTO BILL ================= */

  useEffect(() => {
    const received = Number(cashReceived) || 0;

    if (received === 0) {
      setCashBack(0);
      setDueAmount(total);
      setBillStatus("unpaid");
      return;
    }

    if (received >= total) {
      setCashBack(received - total);
      setDueAmount(0);
      setBillStatus("paid");
    } else {
      setCashBack(0);
      setDueAmount(total - received);
      setBillStatus("unpaid");
    }
  }, [cashReceived, total]);

  /* ================= UPDATE ORDER ================= */

  const updateOrder = async () => {
    if (!loadedOrderId) return showAlert("Load order first", "warning");

    try {
      const res = await axios.put(
        `${API}/orders/${loadedOrderId}/addon`,
        {
          customerName,
          customerPhone,
          address,
          orderDescription,

          orderType,
          paymentMethod,
          billStatus,

          items: cart,
          subtotal,
          total,

          cashReceived: Number(cashReceived) || 0,
          dueAmount: Number(dueAmount) || 0,
          cashBack: Number(cashBack) || 0
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      showAlert("Order Updated ✅", "success");

      /* Only new (unprinted) lines go on the kitchen add-on print;
         the customer bill always prints the FULL order */
      const storedItems = Array.isArray(res.data?.items) ? res.data.items : [];
      const unprinted = Array.isArray(res.data?.unprinted) ? res.data.unprinted : [];
      const anyPrinted = storedItems.some((i) => i.printed);

      const fullItems = storedItems.length
        ? storedItems.map((s) => ({
            line: s.line,
            name: s.name,
            price: Number(s.price),
            qty: Number(s.qty),
          }))
        : cart.map((item) => ({
            line: null,
            name: item.name,
            price: Number(item.price),
            qty: Number(item.qty),
          }));

      const receiptSnapshot = {
        customerName,
        orderType,
        paymentMethod,
        billStatus,
        tableNo,
        customerPhone,
        address,
        orderDescription,

        items: fullItems,
        kitchenItems: anyPrinted && unprinted.length > 0 ? unprinted : fullItems,

        subtotal,
        total,

        cashReceived: Number(cashReceived) || 0,
        cashBack: cashBack,
        dueAmount: dueAmount,
        date: new Date().toLocaleString(),

        invoiceNo: loadedOrderId
      };

      receiptRef.current = receiptSnapshot;
      setShowBill(true);

    } catch (err) {
      console.log(err);
      showAlert("Update failed", "error");
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

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>PizzaGhar Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 80mm;
      font-family: monospace;
      padding: 8px;
      font-size: 13px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 2px 0;
    }
    th {
      border-bottom: 1px solid #000;
    }
    .right { text-align: right; }
    .total { font-weight: bold; font-size: 15px; }
    .small { font-size: 12px; }
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
</html>`;

    printHtml(html, () => setIsPrinting(false), "bill");
  };

  const printKitchenSlip = async () => {
    if (isPrinting) return;

    const data = receiptRef.current;
    if (!data) return;

    /* auto dual-print ON → verify QZ + kitchen printer BEFORE claiming,
       so a failure can never mark the receipt as printed */
    const pre = await autoPrintPreflight("kitchen");
    if (!pre.ok) return;

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

    const totalQty = data.kitchenItems.reduce((a, b) => a + b.qty, 0);
    const totalItems = data.kitchenItems.length;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>PizzaGhar Kitchen Slip</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 80mm;
      font-family: monospace;
      padding: 8px;
      font-size: 13px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td { padding: 2px 0; }
    th { border-bottom: 1px solid #000; }
    .right { text-align: right; }
    .small { font-size: 12px; }
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
  <div class="bold">NOTE: ${data.orderDescription}</div>
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
      ${data.kitchenItems.map(item => `
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
</html>`;

    printHtml(html, () => setIsPrinting(false), "kitchen");
  };

  /* ================= FILTER ================= */

  const filteredItems = menuItems.filter(item =>
    (selectedCategory === "All" || item.category === selectedCategory) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= UI ================= */

  return (
    <div className="flex flex-col lg:flex-row min-h-full lg:h-full bg-gray-100">

      {/* LEFT */}
      <div className="flex-1 p-4 md:p-6 min-h-0 lg:overflow-y-auto">

        <h1 className="text-2xl font-bold mb-4">
          Edit Order POS
        </h1>

        {/* 🔥 LOAD ORDER */}
        <div className="flex gap-2 mb-4">
          <input
            placeholder="Enter Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <button
            onClick={loadOrder}
            className="bg-blue-500 text-white px-4 rounded"
          >
            Load
          </button>
        </div>

        {/* SEARCH */}
        <div className="flex bg-white px-4 py-2 rounded shadow mb-4">
          <Search size={18} />
          <input
            className="ml-2 w-full outline-none"
            placeholder="Search..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* PRODUCTS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white p-4 rounded shadow cursor-pointer"
            >
              <h2>{item.name}</h2>
              <p>Rs {item.price}</p>
            </div>
          ))}
        </div>

      </div>

      {/* RIGHT CART */}
      <div className="w-full lg:w-96 bg-white p-4 md:p-6 shadow-lg lg:shadow-none">

        <h2 className="font-bold mb-4">Edit Cart</h2>

        <input
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="border w-full mb-2 px-3 py-2"
        />
{showPhoneField && (
  <input
    placeholder="Customer Phone"
    value={customerPhone}
    onChange={(e) => setCustomerPhone(e.target.value)}
    className="border w-full mb-2 px-3 py-2"
  />
)}

{showAddressField && (
  <textarea
    placeholder="Delivery Address"
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    className="border w-full mb-2 px-3 py-2 h-16 resize-none"
  />
)}

<textarea
  placeholder="Order Description (optional)"
  value={orderDescription}
  onChange={(e) => setOrderDescription(e.target.value)}
  className="border w-full mb-2 px-3 py-2 h-16 resize-none"
/>

        {/* CART */}
        {cart.map(item => (
          <div key={item.id} className="flex justify-between mb-3">
            <div>
              {item.name} x {item.qty}
            </div>

            <div className="flex gap-2">

              {role !== "cashier" && (
                <button onClick={() => decreaseQty(item.id)}>
                  <Minus size={14} />
                </button>
              )}

              <button onClick={() => increaseQty(item.id)}>
                <Plus size={14} />
              </button>

              {role !== "cashier" && (
                <button onClick={() => removeItem(item.id)}>
                  <Trash2 size={14} />
                </button>
              )}

            </div>
          </div>
        ))}

        {/* TOTAL */}
        <div className="mt-4 font-bold">
          Total: Rs {total}
        </div>

        {/* CASH */}
        <input
          type="number"
          placeholder="Cash Received"
          value={cashReceived}
          onChange={(e) => setCashReceived(e.target.value)}
          className="border w-full mt-3 px-3 py-2"
        />

        <p className="mt-1 text-red-500 font-semibold">
          Due: Rs {dueAmount}
        </p>

        {cashBack > 0 && (
          <p className="mt-1 text-green-600 font-semibold">
            Cash Back: Rs {cashBack}
          </p>
        )}

        {/* UPDATE */}
        <button
          onClick={updateOrder}
          className="mt-6 bg-green-500 text-white w-full py-3 rounded"
        >
          Update Order
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
                className={`flex-1 py-2 rounded ${
                  isPrinting
                    ? "bg-gray-300 text-gray-600"
                    : "bg-green-500 text-white"
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
