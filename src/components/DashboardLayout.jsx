"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Menu } from "lucide-react";

export default function DashboardLayout({ children, allowedRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // start false on both server & client, sync from localStorage after mount
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar_collapsed") === "1");
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
      return next;
    });

  return (
    <ProtectedRoute allowedRole={allowedRole}>
      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-full">
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-50 h-full">
              <Sidebar closeSidebar={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Mobile Top Bar */}
          <div className="md:hidden flex items-center justify-between p-4 bg-white shadow shrink-0">
            <h1 className="text-lg font-bold text-red-500">PizzaGhar</h1>
            <button onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
