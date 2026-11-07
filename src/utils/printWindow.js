"use client";

import { getPrintSettings, qzPrintReceipt } from "./autoPrint";

let logoCache = null;

/* Receipt logo as a data: URI. The QZ HTML renderer has no page origin, so
   the site-relative "/logo.jpeg" path breaks there (only the alt text prints).
   Embedding the image directly works on every path (QZ / popup / iframe);
   fetch once and reuse for the session. */
export async function receiptLogo() {
  if (logoCache) return logoCache;
  try {
    const res = await fetch("/logo.jpeg");
    if (!res.ok) throw new Error("logo fetch failed");
    const blob = await res.blob();
    logoCache = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    logoCache = `${window.location.origin}/logo.jpeg`;
  }
  return logoCache;
}

/* Print helper — hands print() over to the RECEIPT POPUP's own JS context.
   window.print() is synchronous: calling it from the main app thread freezes
   the whole app ("Not Responding") until the print dialog closes. Running it
   inside the popup keeps the app responsive; the popup closes itself.

   A module-level lock makes sure ONE click = ONE print job: repeat clicks
   while a print is in flight are ignored (their stray popup is closed). The
   lock releases when the popup closes (after print/cancel) or after 15s.

   kind ("bill" | "kitchen") routes the job when the admin's Automatic
   Dual Printer Printing toggle is ON: the receipt then goes silently to
   the assigned QZ Tray printer with no browser dialog. Toggle OFF keeps
   this exact popup/iframe flow.

   onDone receives { ok } — ok:false when the print job never launched
   (popup blocked / write failed / QZ error) so callers can keep items
   pending. */

let printingLock = false;
let autoPrintingLock = false;

export function printAndClose(win, onDone) {
  if (!win) {
    if (typeof onDone === "function") onDone({ ok: false });
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
  const finish = (ok) => {
    if (finished) return;
    finished = true;
    printingLock = false;
    if (typeof onDone === "function") onDone({ ok: ok !== false });
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
      finish(false);
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
        finish(true);
      }
    }, 400);
  }, 300);
}

/* Print an HTML receipt:
   - auto dual-printing ON  → silent QZ Tray job on the assigned printer
   - auto dual-printing OFF → popup first (app stays responsive while the
     dialog is open), and if the popup is blocked/fails → hidden same-origin
     iframe fallback (works everywhere; page may pause while the dialog is open) */
export async function printHtml(html, onDone, kind = "bill") {
  try {
    const settings = await getPrintSettings();
    if (settings.autoDualPrint) {
      if (autoPrintingLock) {
        if (typeof onDone === "function") onDone({ ok: false });
        return;
      }
      autoPrintingLock = true;
      await qzPrintReceipt(html, kind, (result) => {
        autoPrintingLock = false;
        if (typeof onDone === "function") onDone(result);
      });
      return;
    }
  } catch {
    /* settings unreachable → default manual flow */
  }

  let win = null;
  try {
    win = window.open("", "_blank", "width=320,height=700");
  } catch (err) {
    win = null;
  }

  if (win) {
    try {
      win.document.write(html);
      win.document.close();
      printAndClose(win, onDone);
      return;
    } catch (err) {
      console.error("Popup write error:", err);
      try {
        win.close();
      } catch (e) {
        /* ignore */
      }
    }
  }

  printIframe(html, onDone);
}

function printIframe(html, onDone) {
  let finished = false;
  let iframe = null;

  const finish = (ok) => {
    if (finished) return;
    finished = true;
    if (iframe) {
      try {
        setTimeout(() => iframe.remove(), 500);
      } catch (e) {
        /* ignore */
      }
    }
    if (typeof onDone === "function") onDone({ ok: ok !== false });
  };

  try {
    iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:80mm;height:120mm;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    const win = iframe.contentWindow;
    let printed = false;
    const doPrint = () => {
      if (printed || finished) return;
      printed = true;
      try {
        win.onafterprint = () => finish(true);
        win.focus();
        win.print();
      } catch (err) {
        console.error("Print error:", err);
        finish(false);
        return;
      }
      /* fallback if the browser never fires afterprint (main thread is
         blocked while the dialog is open, so this only runs after close) */
      setTimeout(() => finish(true), 20000);
    };

    /* wait for receipt images (logo) so they appear on paper */
    const imgs = Array.from(doc.images || []);
    Promise.all(
      imgs.map((im) =>
        im.complete
          ? true
          : new Promise((res) => {
              im.onload = res;
              im.onerror = res;
            })
      )
    ).then(() => setTimeout(doPrint, 150));
    setTimeout(doPrint, 3000);
  } catch (err) {
    console.error("Print error:", err);
    finish(false);
  }
}
