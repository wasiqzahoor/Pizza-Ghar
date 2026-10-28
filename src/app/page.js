"use client";

import { useRouter } from "next/navigation";

export default function RoleSelection() {
  const router = useRouter();

  const handleRole = (role) => {
    router.push(`/login?role=${role}`);
  };

  return (
    <div className="relative min-h-screen flex flex-col">

      {/* Top Navbar */}
      <div className="bg-[#2b2b2b] text-white text-center py-3 sm:py-4 font-semibold text-sm sm:text-lg shadow px-4">
        Fast Food Restaurant Management Software
      </div>

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm brightness-75 "
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1555992336-03a23c8b2e3f')",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-md text-center">

          {/* LOGO IMAGE */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.jpeg"
              alt="Pizza Logo"
              className="h-20 object-contain"
            />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 mb-8">
            Select your role to continue
          </p>

          {/* Buttons */}
          <button
            onClick={() => handleRole("admin")}
            className="w-full bg-white border border-gray-200 hover:shadow-md transition p-4 rounded-xl mb-4 text-gray-700 font-medium"
          >
            Login as Admin
          </button>

          <button
            onClick={() => handleRole("cashier")}
            className="w-full bg-white border border-gray-200 hover:shadow-md transition p-4 rounded-xl mb-4 text-gray-700 font-medium"
          >
            Login as Cashier
          </button>

          <button
            onClick={() => handleRole("chef")}
            className="w-full bg-white border border-gray-200 hover:shadow-md transition p-4 rounded-xl text-gray-700 font-medium"
          >
            Login as Chef
          </button>

          {/* NEW BUTTON */}
          <button
            onClick={() => router.push("/admin-register")}
            className="w-full bg-red-500 hover:bg-red-600 transition p-4 rounded-xl text-white font-medium mt-4"
          >
            Register Restaurant (Admin)
          </button>

          {/* Footer */}
          <p className="mt-8 text-sm text-gray-400">
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
      </div>
    </div>
  );
}
