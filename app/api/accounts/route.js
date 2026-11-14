// API akun: list / add / remove / set aktif (via cookie account cookie terpisah).
import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/auth.js";
import { listAccounts, addAccount, removeAccount } from "../../../lib/accounts.js";

export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return NextResponse.json({ accounts: listAccounts() });
}

export async function POST(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  try {
    await addAccount(body.email, body.label || "");
    return NextResponse.json({ ok: true, accounts: listAccounts() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Param email wajib" }, { status: 400 });
  const remaining = await removeAccount(email);
  const res = NextResponse.json({ ok: true, remaining: remaining.length, accounts: listAccounts() });
  // kalau akun aktif kehapus, hapus cookie pemilih akun
  if (req.headers.get("cookie")?.includes(`active_account=${encodeURIComponent(email)}`)) {
    res.cookies.set("active_account", "", { path: "/", maxAge: 0 });
  }
  return res;
}
