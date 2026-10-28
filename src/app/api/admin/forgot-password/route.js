export const dynamic = "force-dynamic";

import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { OtpCode } from "@/models/OtpCode";
import { User } from "@/models/User";
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

export async function POST(req) {
  try {
    await connectDB();
    const { email } = await req.json();

    const user = await User.findOne({ email });
    if (!user) return jsonError("User not found", 404);

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    await OtpCode.create({
      otp,
      purpose: "reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: RESTAURANT_OWNER_EMAIL,
      subject: "Password Reset OTP",
      html: `<h2>Your password reset code</h2><h1>${otp}</h1>`,
    });

    return Response.json({ message: "Reset code sent to email" });
  } catch (err) {
    console.log(err);
    return jsonError("Failed to send reset OTP");
  }
}
