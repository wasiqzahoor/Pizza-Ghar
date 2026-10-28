"use client";

import { API_BASE } from "@/config/api";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const router = useRouter();

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  const roleInfo = {
    admin: {
      name: "Admin",
      title: "Administrator",
    },
    cashier: {
      name: "Cashier",
      title: "Billing Executive",
    },
    chef: {
      name: "Chef",
      title: "Kitchen Manager",
    },
  };

  const currentUser = roleInfo[role] || {
    name: "User",
    title: "Staff",
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log(error);
    }
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="flex justify-between items-center bg-white p-4 md:p-6 shadow gap-3">
      <h2 className="text-base sm:text-xl font-semibold capitalize truncate">
        {role} Dashboard
      </h2>

      <div className="flex items-center gap-4 md:gap-6 shrink-0">
        {/* User Info */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-medium">{currentUser.name}</p>
            <p className="text-sm text-gray-400">
              {currentUser.title}
            </p>
          </div>

          <div className="bg-gray-200 p-2 rounded-full">
            <User size={18} />
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 transition"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
