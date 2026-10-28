"use client";

import { useState } from "react";
import axios from "axios";
import { API_BASE } from "@/config/api";
import { showAlert } from "@/utils/popup";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const sendResetCode = async () => {
    try {
      await axios.post(`${API_BASE}/api/admin/forgot-password`, { email });
      showAlert("Reset code sent to your email", "success");
      window.location.href = "/reset-password";
    } catch (err) {
      console.log(err);
      showAlert("Failed to send reset code", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Forgot Password
        </h2>

        <input
          placeholder="Enter your email"
          className="border p-3 w-full mb-4 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={sendResetCode}
          className="bg-red-500 text-white w-full p-3 rounded"
        >
          Send Reset Code
        </button>
      </div>
    </div>
  );
}
