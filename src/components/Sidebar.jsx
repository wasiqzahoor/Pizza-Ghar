"use client";

import { API_BASE } from "@/config/api";
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Clock,
  Monitor,
  Menu as MenuIcon,
  Boxes,
  BarChart3,
  Settings,
  Users,
  LogOut,
  X,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar({ closeSidebar, collapsed = false, onToggle }) {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState(null);
  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const menuConfig = {
    admin: [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { name: "POS", path: "/admin/pos", icon: ShoppingCart },
      { name: "Kitchen", path: "/admin/kitchen", icon: ChefHat },
      { name: "Orders", path: "/admin/orders", icon: Clock },
      { name: "ModifyOrders", path: "/admin/editpos", icon: Clock },
      { name: "ChefOrders", path: "/admin/cheforders", icon: Clock },
      { name: "Status Board", path: "/admin/status-board", icon: Monitor },
      { name: "Menu", path: "/admin/menu", icon: MenuIcon },
      { name: "Inventory", path: "/admin/inventory", icon: Boxes },
      { name: "Recipes", path: "/admin/recipes", icon: Boxes },
      { name: "Categories", path: "/admin/categories", icon: Boxes },
      { name: "users", path: "/admin/users", icon: Users },
      { name: "Reports", path: "/admin/reports", icon: BarChart3 },
      { name: "Settings", path: "/admin/settings", icon: Settings },
    ],
    cashier: [
      { name: "Dashboard", path: "/cashier/dashboard", icon: LayoutDashboard },
      { name: "POS", path: "/cashier/pos", icon: ShoppingCart },
      { name: "Orders", path: "/cashier/orders", icon: Clock },
      { name: "ModifyOrders", path: "/cashier/editpos", icon: Clock },
      { name: "ChefOrders", path: "/cashier/cheforders", icon: Clock },
      { name: "Status Board", path: "/cashier/status-board", icon: Monitor },
      { name: "Reports", path: "/cashier/reports", icon: BarChart3 },
    ],
    chef: [
      { name: "Kitchen", path: "/chef/kitchen", icon: ChefHat },
      { name: "ChefOrders", path: "/chef/cheforders", icon: Clock },
      { name: "Status Board", path: "/chef/status-board", icon: Monitor },
      { name: "Inventory", path: "/chef/inventory", icon: Boxes },
    ],
  };

  const handleNavigation = (path) => {
    router.push(path);
    if (closeSidebar) closeSidebar();
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.log(error);
    }
    localStorage.clear();
    document.cookie = "pg_token=; path=/; max-age=0";
    router.push("/");
  };

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } h-full bg-[#040404] text-gray-300 flex flex-col shrink-0 transition-[width] duration-200`}
    >
      {/* Mobile Close Button */}
      {closeSidebar && (
        <div className="flex justify-end p-3 md:hidden">
          <button onClick={closeSidebar} className="text-gray-300 hover:text-white">
            <X size={22} />
          </button>
        </div>
      )}

      {/* Brand + Toggle */}
      <div
        className={`flex items-center gap-2 px-3 pt-4 pb-2 ${
          collapsed ? "flex-col" : "justify-between"
        }`}
      >
        {collapsed ? (
          <img
            src="/logo.jpeg"
            alt="Pizza Ghar"
            className="w-10 h-10 object-contain rounded shrink-0 bg-white p-0.5"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <img
            src="/logo.jpeg"
            alt="Pizza Ghar"
            className="h-14 min-w-0 flex-1 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition shrink-0"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      {/* Menu — own scroll area */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        <div className="space-y-2 pt-3">
          {menuConfig[role]?.map((item, index) => {
            const isActive = pathname === item.path;
            return (
              <div
                key={index}
                onClick={() => handleNavigation(item.path)}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                  collapsed ? "justify-center" : ""
                } ${isActive ? "bg-orange-500 text-white" : "hover:bg-gray-800"}`}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </div>
            );
          })}

          {/* Logout */}
          <div
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-800 text-red-400 mt-6 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </div>
        </div>

        {/* Developer Credit */}
        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-500 leading-relaxed px-1">
            POS Developed by{" "}
            <a
              href="https://www.newaitechsofts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 hover:underline"
            >
              NewAiTechSofts PVT LTD
            </a>
            <br />
            03415287464
          </div>
        )}
      </nav>
    </aside>
  );
}
