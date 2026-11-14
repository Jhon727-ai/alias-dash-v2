// OAuth flow per-akun: state menyimpan email tujuan.
import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth.js";
import { getAccount, createState } from "../../../../lib/accounts.js";
import { oauthClient } from "../../../../lib/gmail.js";

export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const redirectUri = searchParams.get("redirect_uri") || process.env.OAUTH_REDIRECT_URI || "";

  if (!email) return NextResponse.json({ error: "Param email wajib" }, { status: 400 });
  if (!redirectUri) return NextResponse.json({ error: "redirect_uri wajib (atau set OAUTH_REDIRECT_URI)" }, { status: 400 });
  if (!getAccount(email)) return NextResponse.json({ error: `Akun ${email} belum didaftarkan` }, { status: 404 });

  const state = createState(email);
  const oauth = oauthClient(redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
    state,
    login_hint: email,
  });
  return NextResponse.json({ auth_url: url });
}
