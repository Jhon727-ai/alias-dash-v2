// Exchange code -> token, disimpan per email (dari state OAuth flow).
import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth.js";
import { readState, saveToken, getAccount } from "../../../../lib/accounts.js";
import { oauthClient } from "../../../../lib/gmail.js";

export async function POST(req) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const raw = (body.code || "").trim();
  const state = (body.state || "").trim();
  const redirectUri = body.redirect_uri || process.env.OAUTH_REDIRECT_URI || "";

  if (!raw) return NextResponse.json({ error: "code wajib" }, { status: 400 });
  if (!state) return NextResponse.json({ error: "state wajib" }, { status: 400 });

  const flow = await readState(state);
  if (!flow) return NextResponse.json({ error: "state gak valid / kadaluarsa — ulangi dari awal" }, { status: 400 });

  let code = raw;
  const m = raw.match(/[?&]code=([^&]+)/);
  if (m) code = decodeURIComponent(m[1]);

  try {
    const oauth = oauthClient(redirectUri);
    const { tokens } = await oauth.getToken(code);
    saveToken(flow.email, tokens);
    return NextResponse.json({ ok: true, email: flow.email, has_refresh: !!tokens.refresh_token });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
