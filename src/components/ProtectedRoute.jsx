"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children, allowedRole }) {
  const router = useRouter();
  // null on server AND first client render → children SSR'd with data (no hydration mismatch)
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== allowedRole) {
      setBlocked(true);
      router.replace("/");
    }
  }, [allowedRole, router]);

  if (blocked) return null;

  return children;
}
