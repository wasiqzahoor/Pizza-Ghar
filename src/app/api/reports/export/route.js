export const dynamic = "force-dynamic";

import PDFDocument from "pdfkit";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { isValidDate } from "@/lib/paging";
import { startOfDay, endOfDay, dayRange } from "@/lib/dates";

/* EXPORT PDF (thermal receipt-style sale report) */
export async function GET(req) {
  try {
    await connectDB();
    const sp = new URL(req.url).searchParams;
    const range = sp.get("range") || "day";
    const start = sp.get("start");
    const end = sp.get("end");

    const now = new Date();
    let since;
    let until = now;

    if (range === "day") {
      since = startOfDay(now);
      until = endOfDay(now);
    } else if (range === "month") {
      since = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      until = endOfDay(now);
    } else if (range === "year") {
      since = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
    } else if (range === "custom" && isValidDate(start) && isValidDate(end)) {
      since = dayRange(start)[0];
      until = dayRange(end)[1];
    } else {
      // week default
      since = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    }

    const orders = await Order.find({
      deletedAt: null,
      created_at: { $gte: since, $lte: until },
    })
      .select("total orderType")
      .lean();

    const invoices = orders.length;
    const amount = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    /* SALE TYPES */
    const typesMap = new Map();
    for (const o of orders) {
      const t = o.orderType || "Unknown";
      if (!typesMap.has(t)) typesMap.set(t, { order_type: t, invoices: 0, amount: 0 });
      const entry = typesMap.get(t);
      entry.invoices += 1;
      entry.amount += o.total || 0;
    }
    const types = [...typesMap.values()];

    /* TITLE + DATE */
    let title = "Daily Sale Report";
    let fromDate = new Date();
    let toDate = new Date();

    if (range === "day") {
      title = "Daily Sale Report";
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      title = "Weekly Sale Report";
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (range === "month") {
      title = "Monthly Sale Report";
      fromDate.setMonth(fromDate.getMonth() - 1);
    } else if (range === "year") {
      title = "Yearly Sale Report";
      fromDate.setFullYear(fromDate.getFullYear() - 1);
    } else if (range === "custom") {
      title = "Custom Range Report";
      if (start) fromDate = new Date(start);
      if (end) toDate = new Date(end);
    }

    /* PDF */
    const doc = new PDFDocument({ margin: 20, size: [280, 600] });

    const chunks = [];
    const stream = doc.on("data", (chunk) => chunks.push(chunk));
    const done = new Promise((resolve) => stream.on("end", () => resolve(Buffer.concat(chunks))));

    const format = (n) => Number(n || 0).toFixed(2);

    const col1 = 20;
    const col2 = 160;
    const col3 = 210;

    let y = doc.y;

    const drawLine = () => {
      doc.moveTo(20, y).lineTo(260, y).stroke();
      y += 10;
    };

    const row = (label, inv = "", amt = "", bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);

      doc.text(label, col1, y, { width: 130 });
      doc.text(String(inv), col2, y, { width: 30, align: "center" });
      doc.text(String(amt), col3, y, { width: 60, align: "center" });

      y += 18;
    };

    /* HEADER */
    doc.font("Helvetica-Bold").fontSize(14).text("PIZZA GHAR", { align: "center" });
    doc.text(title, { align: "center" });

    y = doc.y + 5;
    doc.font("Helvetica").fontSize(9);

    doc.text(`From: ${fromDate.toLocaleDateString()} ${fromDate.toLocaleTimeString()}`, 20, y);
    y += 12;
    doc.text(`To: ${toDate.toLocaleDateString()} ${toDate.toLocaleTimeString()}`, 20, y);
    y += 12;
    doc.text(`Status: All`, 20, y);
    y += 10;
    drawLine();

    /* TABLE HEADER */
    doc.font("Helvetica-Bold");
    doc.text("Detail", col1, y);
    doc.text("Invoices", col2, y, { width: 40, align: "right" });
    doc.text("Amount", col3, y, { width: 50, align: "right" });
    y += 15;
    drawLine();

    /* SALES */
    doc.font("Helvetica-Bold");
    doc.text("Sales", col1, y);
    y += 15;

    row("Gross Sales", invoices, format(amount));
    row("Cash Sales", invoices, format(amount));

    /* SALE TYPES */
    y += 5;
    doc.font("Helvetica-Bold");
    doc.text("Sale Types", col1, y);
    y += 15;
    doc.font("Helvetica");

    types.forEach((t) => {
      row(t.order_type.toUpperCase(), t.invoices, format(t.amount));
    });

    /* NET */
    y += 5;
    row("Net Cash Before Expense", invoices, format(amount), true);

    /* EXPENSE */
    y += 5;
    doc.font("Helvetica-Bold");
    doc.text("Expense", col1, y);
    y += 12;
    doc.font("Helvetica");
    doc.text("Cash Payments", col1, y);
    y += 15;

    /* RECEIPTS */
    row("Cash Receipts", invoices, format(amount));
    drawLine();

    /* TOTAL */
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Net Total", col1, y);
    doc.text(format(amount), col3, y, { width: 60, align: "right" });

    doc.end();

    const pdfBuffer = await done;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Daily_Report.pdf",
      },
    });
  } catch (error) {
    console.log(error);
    return Response.json({ message: "PDF generation failed" }, { status: 500 });
  }
}
