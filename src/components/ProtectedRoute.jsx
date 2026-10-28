"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children, allowedRole }) {
  const router = useRouter();
  // false on server AND on first client render → no hydration mismatch
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== allowedRole) {
      router.replace("/");
      return;
    }

    setAuthorized(true);
  }, [allowedRole, router]);

  if (!authorized) return null;

  return children;
}
