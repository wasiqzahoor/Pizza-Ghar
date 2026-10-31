"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState, useRef } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

import { Download } from "lucide-react";
import axios from "axios";
import useAuthCheck from "@/hooks/useAuthCheck";
import { showAlert } from "@/utils/popup";

export default function Reports({ initialStats = null, initialConsumption = null }) {

  useAuthCheck();

  const API = `${API_BASE}/api/reports`;

  const [range, setRange] = useState("week");

  const [stats, setStats] = useState(() =>
    initialStats || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      chart: [],
      topItems: [],
    }
  );

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [consumption, setConsumption] = useState(() =>
    initialConsumption || []
  );

  const formatDate = (date) => {
    if (!date) return "";
    return date.replace("T", " ") + ":00";
  };

  const getBackendRange = () => {
    if (range === "day") return "daily";
    return range;
  };

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem("token");

      let url = `${API}?range=${range}`;

      if (range === "custom") {
        url += `&start=${formatDate(startDate)}&end=${formatDate(endDate)}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(res.data);

    } catch (error) {
      console.log(error);
    }
  };

  const fetchConsumption = async () => {
    try {
      const token = localStorage.getItem("token");

      let url = `${API_BASE}/api/dashboard/consumption?range=${getBackendRange()}`;

      if (range === "custom") {
        url += `&start=${formatDate(startDate)}&end=${formatDate(endDate)}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConsumption(Array.isArray(res.data) ? res.data : []);

    } catch (err) {
      console.log(err);
      setConsumption([]);
    }
  };

  const downloadPDF = async () => {
    try {
      if (range === "custom" && (!startDate || !endDate)) {
        showAlert("Select date range first", "warning");
        return;
      }

      const token = localStorage.getItem("token");

      let url = `${API_BASE}/api/reports/export?range=${range}`;

      if (range === "custom") {
        url += `&start=${formatDate(startDate)}&end=${formatDate(endDate)}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });

      const blob = new Blob([res.data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "sales-report.pdf";
      link.click();

    } catch (error) {
      console.log(error);
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchReports(), fetchConsumption()]);
  };

  const didInitialLoad = useRef(!(initialStats && initialConsumption));

  useEffect(() => {
    if (range === "custom" && (!startDate || !endDate)) return;
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      return;
    }

    const delay = setTimeout(fetchAll, 500);
    return () => clearTimeout(delay);

  }, [range, startDate, endDate]);

  const getConsumptionColor = (percentage) => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 50) return "bg-yellow-400";
    return "bg-green-500";
  };

  return (
    <div className="p-4 md:p-8 bg-[#f4f6f9] h-full overflow-auto">

      <div className="bg-white rounded-3xl shadow-sm p-5 md:p-8 mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sales Reports</h1>
          <p className="text-gray-500 mt-2">
            Detailed analysis of your restaurant performance
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">

          <div className="flex gap-2 flex-wrap">
            {["custom", "day", "week", "month", "year"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-xl ${
                  range === r ? "bg-orange-500 text-white" : "bg-gray-100"
                }`}
              >
                {r === "day" ? "Today" : r === "week" ? "Last 7 Days" : r}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="flex gap-3">
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border px-3 py-2 rounded-xl"
              />
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border px-3 py-2 rounded-xl"
              />
            </div>
          )}

          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white rounded-xl"
          >
            <Download size={16} />
            Export PDF
          </button>

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <p>Total Revenue</p>
          <h2 className="text-3xl font-bold">
            Rs {stats.totalRevenue.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <p>Total Orders</p>
          <h2 className="text-3xl font-bold">{stats.totalOrders}</h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <p>Avg Order Value</p>
          <h2 className="text-3xl font-bold">
            Rs {stats.avgOrderValue.toLocaleString()}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm">
          <h3 className="text-xl font-semibold mb-6">Revenue Trend</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#ef4444" fill="#fee2e2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <h3 className="text-xl font-semibold mb-6">Top Selling Items</h3>

          <div className="space-y-4 max-h-80 overflow-y-auto">
            {stats.topItems?.map((item, index) => (
              <div key={index} className="flex justify-between bg-gray-50 p-3 rounded-xl">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.qty} sold</p>
                </div>
                <div className="text-sm font-semibold">
                  Rs {(Number(item.total) || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

<div className="bg-white rounded-3xl shadow-sm p-6">
  <h3 className="text-xl font-semibold mb-6">
    Ingredient Consumption Report
  </h3>

  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] border-collapse">
      <thead>
        <tr className="text-left text-sm text-gray-600 border-b">
          <th className="py-3 px-2 whitespace-nowrap">Ingredient</th>
          <th className="py-3 px-2 text-center whitespace-nowrap">Used</th>
          <th className="py-3 px-2 text-center whitespace-nowrap">Remaining</th>
          <th className="py-3 px-2 whitespace-nowrap">Consumption</th>
          <th className="py-3 px-2 text-right whitespace-nowrap">%</th>
        </tr>
      </thead>

      <tbody>
        {consumption.map((item) => (
          <tr
            key={item.id}
            className="border-b last:border-b-0 text-sm"
          >
            <td className="py-4 font-medium">
              {item.name}
            </td>

            <td className="py-4 text-center">
              {item.used_stock}
            </td>

            <td className="py-4 text-center">
              {item.current_stock}
            </td>

            <td className="py-4">
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className={`${getConsumptionColor(
                    item.consumption_percentage
                  )} h-2 rounded-full`}
                  style={{
                    width: `${item.consumption_percentage}%`,
                  }}
                />
              </div>
            </td>

            <td className="py-4 text-right font-semibold">
              {item.consumption_percentage}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

    </div>
  );
}
