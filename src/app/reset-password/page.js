"use client";

import { useState } from "react";
import axios from "axios";
import { API_BASE } from "@/config/api";
import { showAlert } from "@/utils/popup";

export default function ResetPassword() {
  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetPassword = async () => {
    try {
      await axios.post(`${API_BASE}/api/admin/reset-password`, form);
      showAlert("Password updated successfully", "success");
      window.location.href = "/login";
    } catch (err) {
      console.log(err);
      showAlert("Password reset failed", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Reset Password
        </h2>

        <input
          name="email"
          placeholder="Email"
          className="border p-3 w-full mb-3 rounded"
          onChange={handleChange}
        />

        <input
          name="otp"
          placeholder="Enter OTP"
          className="border p-3 w-full mb-3 rounded"
          onChange={handleChange}
        />

        <input
          name="newPassword"
          type="password"
          placeholder="New Password"
          className="border p-3 w-full mb-4 rounded"
          onChange={handleChange}
        />

        <button
          onClick={resetPassword}
          className="bg-green-500 text-white w-full p-3 rounded"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
