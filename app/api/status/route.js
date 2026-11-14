// Status global + pemilihan akun aktif (cookie active_account).
import { NextResponse } from "next/server";
import { activeEmail } from "../../../lib/active.js";
import { requireAuth } from "../../../lib/auth.js";
import { listAccounts, getAccount } from "../../../lib/accounts.js";

export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const accounts = listAccounts();
  const m = (req.headers.get("cookie") || "").match(/active_account=([^;]+)/);
  const active = m ? decodeURIComponent(m[1]) : "";
  const valid = active && accounts.find(a => a.email === active && a.connected);
  return NextResponse.json({
    accounts,
    active_account: valid ? active : (accounts.find(a => a.connected)?.email || ""),
    master: process.env.MASTER_EMAIL || null,
    password_set: !!process.env.DASH_PASSWORD,
  });
}

// Set akun aktif
export async function POST(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  if (!email || !getAccount(email)) return NextResponse.json({ error: "Akun gak ketemu" }, { status: 404 });
  const res = NextResponse.json({ ok: true, active_account: email });
  res.cookies.set("active_account", email, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600, secure: true,
  });
  return res;
}
