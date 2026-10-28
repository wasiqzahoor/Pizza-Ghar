"use client";

/* Print helper — hands print() over to the RECEIPT POPUP's own JS context.
   window.print() is synchronous: calling it from the main app thread freezes
   the whole app ("Not Responding") until the print dialog closes. Running it
   inside the popup keeps the app responsive; the popup closes itself.

   A module-level lock makes sure ONE click = ONE print job: repeat clicks
   while a print is in flight are ignored (their stray popup is closed). The
   lock releases when the popup closes (after print/cancel) or after 15s. */

let printingLock = false;

export function printAndClose(win, onDone) {
  if (!win) {
    if (typeof onDone === "function") onDone();
    return;
  }

  // Already printing → close the duplicate popup, do nothing.
  if (printingLock) {
    try {
      win.close();
    } catch (err) {
      console.error("Close error:", err);
    }
    return;
  }
  printingLock = true;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    printingLock = false;
    if (typeof onDone === "function") onDone();
  };

  setTimeout(() => {
    try {
      win.focus();
      const doc = win.document;
      const script = doc.createElement("script");
      script.textContent =
        "window.onafterprint = function () { window.close(); };" +
        "window.print();";
      (doc.body || doc.documentElement).appendChild(script);
    } catch (err) {
      console.error("Print error:", err);
      try {
        win.close();
      } catch (closeErr) {
        console.error("Close error:", closeErr);
      }
      finish();
      return;
    }

    const started = Date.now();
    const timer = setInterval(() => {
      let closed = false;
      try {
        closed = win.closed;
      } catch {
        closed = true;
      }
      if (closed || Date.now() - started > 15000) {
        clearInterval(timer);
        finish();
      }
    }, 400);
  }, 300);
}
