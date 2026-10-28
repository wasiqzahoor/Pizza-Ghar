"use client";

import { Suspense } from "react";
import { API_BASE } from "@/config/api";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { showAlert } from "@/utils/popup";

function LoginInner() {
  const params = useSearchParams();
  const roleParam = params.get("role");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const expiry = localStorage.getItem("token_expiry");

    if (token && role && expiry && Date.now() < Number(expiry)) {
      router.replace(`/${role}/dashboard`);
    } else {
      localStorage.clear();
    }
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Please enter email and password", "warning");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.message || "Login failed", "error");
        setLoading(false);
        return;
      }

      if (roleParam && data.user.role !== roleParam) {
        showAlert(`This account is not ${roleParam}`, "error");
        setLoading(false);
        return;
      }

      const expiry = Date.now() + 60 * 60 * 1000;

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("token_expiry", expiry);

      router.push(`/${data.user.role}/dashboard`);
    } catch (err) {
      console.error(err);
      showAlert("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 p-4">
      {/* Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.jpeg"
            alt="Pizza Ghar Logo"
            className="h-20 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h1 className="mt-3 text-lg font-bold text-gray-800">Pizza Ghar POS</h1>
          <span className="mt-2 inline-block text-xs font-semibold tracking-wide uppercase bg-red-100 text-red-600 px-3 py-1 rounded-full">
            Login as {roleParam?.toUpperCase() || "USER"}
          </span>
        </div>

        {/* Inputs */}
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
        />

        <div className="text-right mb-4">
          <button
            onClick={() => router.push("/forgot-password")}
            className="text-sm text-red-500 hover:underline"
          >
            Forgot Password? (admin only)
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white p-3 rounded-lg font-semibold shadow transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>

      {/* Footer Credit */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        POS Developed by{" "}
        <a
          href="https://www.newaitechsofts.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-500 hover:underline font-medium"
        >
          NewAiTechSofts PVT LTD
        </a>{" "}
        03415287464
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
