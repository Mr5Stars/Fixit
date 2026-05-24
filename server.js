// ============================================================
//  FixIt Pro — Backend Server (No Payments)
//  Stack: Node.js + Express + Supabase + Resend
// ============================================================
//
//  ENVIRONMENT VARIABLES (set in Railway):
//
//  SUPABASE_URL      → Supabase: Settings > API > Project URL
//  SUPABASE_KEY      → Supabase: Settings > API > anon public key
//  RESEND_API_KEY    → Resend: API Keys > your key
//  YOUR_EMAIL        → your email address (to receive booking alerts)
//
// ============================================================

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const app = express();
app.use(cors());
app.use(express.json());

// ── Clients ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const YOUR_EMAIL = process.env.YOUR_EMAIL || "you@example.com";

// ── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "FixIt Pro backend is running ✅" });
});

// ── ROUTE: Save booking + send emails ────────────────────────
app.post("/book", async (req, res) => {
  try {
    const { name, email, phone, address, service, date, time, note } = req.body;

    // 1. Save to Supabase
    const { data, error } = await supabase
      .from("bookings")
      .insert([{ name, email, phone, address, service, date, time, note, paid: false }])
      .select();

    if (error) {
      console.error("Supabase error:", error.message);
      return res.status(500).json({ error: "Could not save booking." });
    }

    // 2. Confirmation email to customer
    await resend.emails.send({
      from: "FixIt Pro <onboarding@resend.dev>",
      to: email,
      subject: "Your appointment is confirmed! 🔨",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fdf6ec;border-radius:12px">
          <h2 style="color:#2c1f0e">Appointment Confirmed!</h2>
          <p style="color:#5a4a35">Hi ${name}, your handyman appointment is all set.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px 0;color:#8a7968;font-size:13px">Service</td><td style="padding:8px 0;color:#2c1f0e;font-weight:600">${service}</td></tr>
            <tr><td style="padding:8px 0;color:#8a7968;font-size:13px">Date</td><td style="padding:8px 0;color:#2c1f0e;font-weight:600">${date}</td></tr>
            <tr><td style="padding:8px 0;color:#8a7968;font-size:13px">Time</td><td style="padding:8px 0;color:#2c1f0e;font-weight:600">${time}</td></tr>
            <tr><td style="padding:8px 0;color:#8a7968;font-size:13px">Address</td><td style="padding:8px 0;color:#2c1f0e;font-weight:600">${address}</td></tr>
          </table>
          <p style="color:#5a4a35;font-size:13px">Need to reschedule? Just reply to this email.</p>
          <p style="color:#8a7968;font-size:12px">— The FixIt Pro Team</p>
        </div>
      `,
    });

    // 3. Alert email to you (business owner)
    await resend.emails.send({
      from: "FixIt Pro <onboarding@resend.dev>",
      to: YOUR_EMAIL,
      subject: `🔨 New Booking: ${service} on ${date}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f0f9f4;border-radius:12px">
          <h2 style="color:#2c7a3e">New Booking!</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Customer</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Email</td><td style="padding:8px 0">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Phone</td><td style="padding:8px 0">${phone}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Service</td><td style="padding:8px 0;font-weight:600">${service}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Date & Time</td><td style="padding:8px 0;font-weight:600">${date} at ${time}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Address</td><td style="padding:8px 0">${address}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Notes</td><td style="padding:8px 0">${note || "None"}</td></tr>
          </table>
        </div>
      `,
    });

    res.json({ success: true, bookingId: data[0].id });
  } catch (err) {
    console.error("Booking error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: View all bookings (admin) ─────────────────────────
app.get("/bookings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FixIt Pro backend running on port ${PORT}`);
});
