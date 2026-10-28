"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

const ALERT_STYLES = {
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    btn: "bg-green-500 hover:bg-green-600",
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-red-500",
    btn: "bg-red-500 hover:bg-red-600",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    btn: "bg-amber-500 hover:bg-amber-600",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    btn: "bg-blue-500 hover:bg-blue-600",
  },
};

export default function GlobalPopup() {
  const [alertState, setAlertState] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    const onAlert = (e) => setAlertState(e.detail || {});
    const onConfirm = (e) => setConfirmState(e.detail || {});

    window.addEventListener("pg:alert", onAlert);
    window.addEventListener("pg:confirm", onConfirm);

    return () => {
      window.removeEventListener("pg:alert", onAlert);
      window.removeEventListener("pg:confirm", onConfirm);
    };
  }, []);

  /* success alerts auto-dismiss */
  useEffect(() => {
    if (alertState && alertState.type === "success") {
      const t = setTimeout(() => {
        setAlertState(null);
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [alertState]);

  const closeAlert = () => setAlertState(null);
  const closeConfirm = (val) => {
    if (confirmState && typeof confirmState.resolve === "function") {
      confirmState.resolve(val);
    }
    setConfirmState(null);
  };

  const aStyle = alertState
    ? ALERT_STYLES[alertState.type] || ALERT_STYLES.info
    : null;
  const AlertIcon = aStyle ? aStyle.icon : null;

  return (
    <>
      {/* ================= ALERT ================= */}
      {alertState && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={closeAlert}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="flex justify-end">
              <button
                onClick={closeAlert}
                className="text-gray-400 hover:text-gray-600"
                aria-label="close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={`flex justify-center -mt-2 mb-3 ${aStyle.iconColor}`}>
              <AlertIcon size={44} strokeWidth={1.6} />
            </div>

            <p className="text-gray-800 text-sm sm:text-base leading-relaxed whitespace-pre-line break-words">
              {alertState.message}
            </p>

            <button
              onClick={closeAlert}
              className={`mt-5 px-6 py-2 rounded-lg text-white text-sm font-medium transition ${aStyle.btn}`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ================= CONFIRM ================= */}
      {confirmState && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => closeConfirm(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`p-2 rounded-full ${
                  confirmState.danger
                    ? "bg-red-100 text-red-500"
                    : "bg-orange-100 text-orange-500"
                }`}
              >
                <AlertTriangle size={22} />
              </span>
              <h3 className="font-bold text-gray-800">
                {confirmState.title}
              </h3>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed break-words">
              {confirmState.message}
            </p>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => closeConfirm(false)}
                className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm transition"
              >
                Cancel
              </button>

              <button
                onClick={() => closeConfirm(true)}
                className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition ${
                  confirmState.danger
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
