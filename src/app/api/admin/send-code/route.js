export const dynamic = "force-dynamic";

import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { OtpCode } from "@/models/OtpCode";
import { jsonError } from "@/lib/paging";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const RESTAURANT_OWNER_EMAIL =
  process.env.RESTAURANT_OWNER_EMAIL || "Soriic.org@gmail.com";

export async function POST() {
  try {
    await connectDB();

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    await OtpCode.create({
      otp,
      purpose: "register",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: RESTAURANT_OWNER_EMAIL,
      subject: "Admin Registration Code",
      html: `<h2>Your registration code is</h2><h1>${otp}</h1>`,
    });

    return Response.json({ message: "Code sent to owner email" });
  } catch (err) {
    console.log(err);
    return jsonError("Failed to send code");
  }
}

export { RESTAURANT_OWNER_EMAIL, transporter };
