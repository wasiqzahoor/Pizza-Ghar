"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/config/api";
import { showAlert } from "@/utils/popup";

export default function useAuthCheck() {
  const router = useRouter();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        showAlert("Session expired. Please login again.", "warning");
        router.replace("/");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Token expired");
        }
      } catch (err) {
        showAlert("Session expired. Please login again.", "warning");
        localStorage.removeItem("token");
        router.replace("/");
      }
    };

    verifyToken();
  }, [router]);
}
