"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/config/api";
import { showAlert } from "@/utils/popup";

const VERIFY_COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = "authVerifyAt";

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

      // Skip the network verify if a recent one already succeeded (fast client-side navigation)
      const last = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
      if (Date.now() - last < VERIFY_COOLDOWN_MS) return;

      try {
        const res = await fetch(`${API_BASE}/api/auth/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Token expired");
        }

        sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      } catch (err) {
        sessionStorage.removeItem(COOLDOWN_KEY);
        showAlert("Session expired. Please login again.", "warning");
        localStorage.removeItem("token");
        document.cookie = "pg_token=; path=/; max-age=0";
        router.replace("/");
      }
    };

    verifyToken();
  }, [router]);
}
