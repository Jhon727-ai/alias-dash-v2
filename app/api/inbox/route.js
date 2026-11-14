// Inbox per alias, scoped ke akun aktif (cookie active_account).
import { NextResponse } from "next/server";
import { activeEmail } from "../../../lib/active.js";
import { requireAuth } from "../../../lib/auth.js";
import { getGmail, buildAliasQuery } from "../../../lib/gmail.js";
import { getAccount, hasToken } from "../../../lib/accounts.js";


export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const email = activeEmail(req);
  if (!email || !getAccount(email)) {
    return NextResponse.json({ error: "NO_ACTIVE_ACCOUNT" }, { status: 400 });
  }
  if (!hasToken(email)) {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const alias = searchParams.get("alias");
  const max = Math.min(parseInt(searchParams.get("max") || "20"), 50);
  if (!alias) return NextResponse.json({ error: "Param alias wajib" }, { status: 400 });

  try {
    const gmail = await getGmail(email);
    const q = buildAliasQuery(alias);
    const list = await gmail.users.messages.list({ userId: "me", q, maxResults: max });
    const msgs = list.data.messages || [];
    const detailed = await Promise.all(
      msgs.slice(0, max).map(async (m) => {
        const full = await gmail.users.messages.get({ userId: "me", id: m.id, format: "metadata" });
        const headers = full.data.payload?.headers || [];
        const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
        return { id: m.id, from: get("From"), subject: get("Subject"), date: get("Date"), snippet: full.data.snippet || "" };
      })
    );
    return NextResponse.json({ account: email, alias, count: list.data.resultSizeEstimate, messages: detailed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
