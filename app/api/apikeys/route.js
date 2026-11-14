// CRUD API keys — dikelola via dashboard (session auth) ATAU key lain.
import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/auth.js";
import { createApiKey, revokeApiKey, listApiKeys } from "../../../lib/apikeys.js";

export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return NextResponse.json({ keys: listApiKeys() });
}

export async function POST(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body.name || !String(body.name).trim()) {
    return NextResponse.json({ error: "name wajib" }, { status: 400 });
  }
  const { id, key } = await createApiKey(body.name.trim());
  // plaintext key cuma di sini — SEKALI
  return NextResponse.json({ ok: true, id, name: body.name.trim(), key, note: "Copy sekarang. Key ga bakal ditampilin lagi." });
}

export async function DELETE(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("id") || searchParams.get("name");
  if (!target) return NextResponse.json({ error: "Param id atau name wajib" }, { status: 400 });
  await revokeApiKey(target);
  return NextResponse.json({ ok: true, keys: listApiKeys() });
}
