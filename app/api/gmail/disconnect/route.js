// Disconnect token satu akun (alias tetap tersimpan).
import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth.js";
import { getAccount, deleteToken } from "../../../../lib/accounts.js";

export async function POST(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  if (!email || !getAccount(email)) return NextResponse.json({ error: "Akun gak ketemu" }, { status: 404 });
  const ok = deleteToken(email);
  return NextResponse.json({ ok, email });
}
