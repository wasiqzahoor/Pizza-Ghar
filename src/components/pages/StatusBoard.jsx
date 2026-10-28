"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect } from "react";
import { Utensils, CheckCircle } from "lucide-react";
import axios from "axios";
import useAuthCheck from "@/hooks/useAuthCheck";

export default function StatusBoard() {
  useAuthCheck();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");

  const API = `${API_BASE}/api/orders`;

  const fetchOrders = async () => {
    try {
      const res = await axios.get(
        `${API}/kitchen`,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      setOrders(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter(order =>
    order.id.toString().includes(search)
  );

  const preparingOrders =
    filteredOrders.filter(o => o.status === "preparing");

  const readyOrders =
    filteredOrders.filter(o => o.status === "ready");

  return (

    <div className="p-4 sm:p-6 md:p-8 bg-gray-100 h-full flex flex-col overflow-hidden">

      <h1 className="text-2xl font-bold mb-6">
        Status Board
      </h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-xl shadow-sm focus:outline-none"
        />
      </div>

      <div className="bg-black text-white rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 mb-6 md:mb-8 shadow-lg">

        <div className="flex items-center gap-4">
          <div className="bg-red-500 p-3 rounded-xl">
            <Utensils size={28} />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold">
            Order Status
          </h2>
        </div>

        <p className="text-gray-300 text-sm sm:text-lg">
          Stay tunned about order status
        </p>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">

        <div className="bg-white rounded-2xl shadow flex flex-col overflow-hidden ">

          <div className="bg-blue-100 border-t-4 border-blue-500 p-6 text-center">
            <h3 className="text-2xl font-bold text-blue-800 tracking-widest">
              PREPARING
            </h3>
            <p className="text-blue-600 mt-2">
              We are making your food with love
            </p>
          </div>

          <div className="flex-1 p-6 md:p-10 flex flex-wrap gap-6 justify-center overflow-y-auto ">

            {preparingOrders.map((order) => (
              <div
                key={order.id}
                className="border-2 border-dashed border-gray-300 px-8 sm:px-12 md:px-16 py-6 sm:py-8 md:py-10 rounded-2xl text-2xl sm:text-3xl md:text-4xl font-bold text-gray-700"
              >
                #{order.id}
              </div>
            ))}

            {preparingOrders.length === 0 && (
              <p className="text-gray-400">
                No orders preparing
              </p>
            )}

          </div>

        </div>

        <div className="bg-white rounded-2xl shadow flex flex-col overflow-hidden">

          <div className="bg-green-100 border-t-4 border-green-600 p-6 text-center">
            <h3 className="text-2xl font-bold text-green-800 tracking-widest">
              READY TO COLLECT
            </h3>
            <p className="text-green-600 mt-2">
              Please pick up your order
            </p>
          </div>

          <div className="flex-1 p-6 md:p-10 flex flex-col gap-6 items-center overflow-y-auto">

            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-green-600 text-white px-8 sm:px-12 md:px-16 py-6 sm:py-8 md:py-10 rounded-2xl text-2xl sm:text-3xl md:text-4xl font-bold shadow-lg flex flex-col items-center w-full max-w-md"
              >
                #{order.id}

                <span className="text-sm mt-2 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Ready
                </span>
              </div>
            ))}

            {readyOrders.length === 0 && (
              <p className="text-gray-400">
                No orders ready
              </p>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
