"use client";

/* Global popup helpers — custom styled alerts & confirm dialogs.
   Works anywhere (components, hooks, callbacks) via window events.
   Rendered by <GlobalPopup /> mounted once in root layout. */

export function showAlert(message, type = "info") {
  window.dispatchEvent(
    new CustomEvent("pg:alert", {
      detail: { message: String(message ?? ""), type },
    })
  );
}

export function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("pg:confirm", {
        detail: {
          message: String(message ?? ""),
          title: options.title || "Confirm",
          danger: !!options.danger,
          resolve,
        },
      })
    );
  });
}
