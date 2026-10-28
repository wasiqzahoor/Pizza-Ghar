"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/config/api";
import { showAlert } from "@/utils/popup";

export default function AdminRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* SEND OTP */
  const sendOTP = async () => {
    try {
      await axios.post(`${API_BASE}/api/admin/send-code`);
      showAlert("Secret code sent to restaurant owner email", "success");
      setStep(2);
    } catch (err) {
      console.log(err);
      showAlert("Failed to send OTP", "error");
    }
  };

  /* VERIFY OTP + REGISTER */
  const registerAdmin = async () => {
    try {
      await axios.post(`${API_BASE}/api/admin/register`, form);
      showAlert("Admin Registered Successfully", "success");
      router.push("/login");
    } catch (err) {
      console.log(err);
      showAlert("Invalid OTP or registration failed", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Admin Registration
        </h2>

        {step === 1 && (
          <>
            <input
              name="name"
              placeholder="Name"
              className="border p-3 w-full mb-3 rounded"
              onChange={handleChange}
            />

            <input
              name="email"
              placeholder="Email"
              className="border p-3 w-full mb-3 rounded"
              onChange={handleChange}
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              className="border p-3 w-full mb-4 rounded"
              onChange={handleChange}
            />

            <button
              onClick={sendOTP}
              className="bg-red-500 text-white w-full p-3 rounded"
            >
              Send Secret Code
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <input
              name="otp"
              placeholder="Enter Secret Code"
              className="border p-3 w-full mb-4 rounded"
              onChange={handleChange}
            />

            <button
              onClick={registerAdmin}
              className="bg-green-500 text-white w-full p-3 rounded"
            >
              Verify Code & Register
            </button>
          </>
        )}
      </div>
    </div>
  );
}
