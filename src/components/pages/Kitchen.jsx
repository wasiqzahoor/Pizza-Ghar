"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect } from "react";
import { ChefHat, Clock, CheckCircle } from "lucide-react";
import axios from "axios";
import Topbar from "@/components/Topbar";
import useAuthCheck from "@/hooks/useAuthCheck";

export default function Kitchen() {
  useAuthCheck();

  const [orders, setOrders] = useState([]);

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
    }
    catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval =
      setInterval(fetchOrders, 5000);

    return () =>
      clearInterval(interval);
  }, []);

  const markReady = async (id) => {
    try {
      await axios.put(
        `${API}/${id}/ready`,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      fetchOrders();
    }
    catch (error) {
      console.log(error);
    }
  };

  const completeOrder = async (id) => {
    try {
      await axios.put(
        `${API}/${id}/complete`,
        {},
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      fetchOrders();
    }
    catch (error) {
      console.log(error);
    }
  };

  const preparingCount =
    orders.filter(o =>
      o.status === "preparing"
    ).length;

  const readyCount =
    orders.filter(o =>
      o.status === "ready"
    ).length;

  return (

    <>
      <Topbar />

      <div className="p-4 md:p-8 bg-[#111827] min-h-full text-white">

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 md:mb-8">

          <div className="flex items-center gap-3">

            <ChefHat className="text-red-500" />

            <h1 className="text-2xl font-bold">
              Kitchen Display System
            </h1>

          </div>

          <div className="flex gap-6 text-sm">

            <div className="flex items-center gap-2">

              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>

              Preparing ({preparingCount})

            </div>

            <div className="flex items-center gap-2">

              <span className="w-3 h-3 bg-green-500 rounded-full"></span>

              Ready ({readyCount})

            </div>

          </div>

        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 overflow-y-auto pr-2"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >

          {orders.map((order) => (

            <div
              key={order.id}
              className={`rounded-2xl overflow-hidden border ${
                order.status === "preparing"
                  ? "border-blue-500"
                  : "border-green-500"
              }`}
            >

              <div
                className={`p-4 flex justify-between items-center ${
                  order.status === "preparing"
                    ? "bg-blue-600"
                    : "bg-green-600"
                }`}
              >

                <div>

                  <h2 className="font-bold text-lg">
                    #{order.id}
                  </h2>

                  <p className="text-sm opacity-80">
                    {order.type}
                  </p>

                </div>

                <div className="flex items-center gap-2 text-sm">

                  <Clock size={16} />

                  {order.time}

                </div>

              </div>

              <div className="bg-[#1f2937] p-5 space-y-4">

                <div className="flex justify-between text-sm opacity-80">

                  <span>{order.customer}</span>

                  <span>-</span>

                </div>

                <div className="space-y-2">

                  {order.items?.map((item, index) => (

                    <div
                      key={index}
                      className="flex items-center gap-3"
                    >

                      <span className="bg-gray-700 px-2 py-1 text-xs rounded">

                        {item.qty}x

                      </span>

                      <span>{item.name}</span>

                    </div>

                  ))}

                </div>

              </div>

              <div className="p-4 bg-[#1f2937]">

                {order.status === "preparing" ? (

                  <button
                    onClick={() =>
                      markReady(order.id)
                    }
                    className="w-full bg-green-600 hover:bg-green-700 transition py-3 rounded-xl flex items-center justify-center gap-2 font-medium"
                  >

                    <CheckCircle size={18} />

                    Mark Ready

                  </button>

                ) : (

                  <button
                    onClick={() =>
                      completeOrder(order.id)
                    }
                    className="w-full bg-gray-600 hover:bg-gray-700 transition py-3 rounded-xl flex items-center justify-center gap-2 font-medium"
                  >

                    <CheckCircle size={18} />

                    Complete

                  </button>

                )}

              </div>

            </div>

          ))}

        </div>

      </div>
    </>

  );

}
