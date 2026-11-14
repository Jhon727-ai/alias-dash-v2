// Bulk scan per akun aktif — 1 query gabungan, group per alias.
import { NextResponse } from "next/server";
import { activeEmail } from "../../../../lib/active.js";
import { requireAuth } from "../../../../lib/auth.js";
import { getGmail } from "../../../../lib/gmail.js";
import { getAccount, hasToken, readAliases, mutateAliases, touchAccount } from "../../../../lib/accounts.js";


function extractAddresses(header) {
  const out = [];
  const re = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+)/g;
  let m;
  while ((m = re.exec(header || "")) !== null) out.push(m[1].toLowerCase());
  return out;
}

export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const email = activeEmail(req);
  if (!email || !getAccount(email)) return NextResponse.json({ error: "NO_ACTIVE_ACCOUNT" }, { status: 400 });
  if (!hasToken(email)) return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const max = Math.min(parseInt(searchParams.get("max") || "100"), 200);
  const track = searchParams.get("track") !== "false";

  try {
    const gmail = await getGmail(email);
    const local = email.split("@")[0].replace(/\./g, "");
    const q = `to:${local} OR to:${email}`;
    const list = await gmail.users.messages.list({ userId: "me", q, maxResults: max });
    const msgs = list.data.messages || [];

    const perAlias = {};
    const aliasSet = new Set(readAliases(email).map((a) => a.alias.toLowerCase()));

    await Promise.all(
      msgs.map(async (m) => {
        const full = await gmail.users.messages.get({ userId: "me", id: m.id, format: "metadata" });
        const headers = full.data.payload?.headers || [];
        const get = (n) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
        const addrs = [...extractAddresses(get("To")), ...extractAddresses(get("Delivered-To"))];
        for (const addr of new Set(addrs)) {
          const bare = addr.split("@")[0];
          const key = aliasSet.has(addr) ? addr : aliasSet.has(bare) ? bare : null;
          if (!key) continue;
          if (!perAlias[key]) perAlias[key] = { count: 0, last_date: "" };
          perAlias[key].count += 1;
          const d = full.data.internalDate ? new Date(parseInt(full.data.internalDate, 10)).toISOString() : "";
          if (d > (perAlias[key].last_date || "")) perAlias[key].last_date = d;
        }
      })
    );

    if (track && Object.keys(perAlias).length > 0) {
      const now = new Date().toISOString();
      await mutateAliases(email, (list2) =>
        list2.map((a) =>
          perAlias[a.alias.toLowerCase()]
            ? { ...a, last_used_at: perAlias[a.alias.toLowerCase()].last_date || now }
            : a
        )
      );
      await touchAccount(email, now);
    }

    return NextResponse.json({
      account: email,
      scanned: msgs.length,
      matched_aliases: Object.keys(perAlias).length,
      stats: perAlias,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
