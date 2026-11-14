// Aliases scoped per akun aktif.
import { NextResponse } from "next/server";
import { activeEmail } from "../../../lib/active.js";
import { requireAuth } from "../../../lib/auth.js";
import { dotCombinations, plusAlias, isValidEmailLocal } from "../../../lib/dots.js";
import { getAccount, hasToken, readAliases, mutateAliases, listAccounts } from "../../../lib/accounts.js";


export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const email = activeEmail(req);
  if (!email || !getAccount(email)) return NextResponse.json({ error: "NO_ACTIVE_ACCOUNT" }, { status: 400 });
  return NextResponse.json({ account: email, aliases: readAliases(email) });
}

export async function POST(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const email = activeEmail(req);
  if (!email || !getAccount(email)) return NextResponse.json({ error: "NO_ACTIVE_ACCOUNT" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { mode, local, tag, label } = body;
  const accLocal = email.split("@")[0];

  if (mode !== "dot" && mode !== "plus") {
    return NextResponse.json({ error: "Mode harus 'dot' atau 'plus'" }, { status: 400 });
  }
  if (mode === "dot") {
    if (!isValidEmailLocal(local || accLocal)) {
      return NextResponse.json({ error: "Local part gak valid" }, { status: 400 });
    }
  } else if (!plusAlias(local || accLocal, tag)) {
    return NextResponse.json({ error: "Tag gak valid" }, { status: 400 });
  }

  let added = [];
  const total = await mutateAliases(email, (list) => {
    const existing = new Set(list.map((a) => a.alias));
    if (mode === "dot") {
      const target = local || accLocal;
      const combos = dotCombinations(target).filter((c) => !existing.has(c));
      for (const c of combos.slice(0, 500)) {
        added.push({ alias: c, label: label || "", kind: "dot", created_at: new Date().toISOString() });
      }
    } else {
      const a = plusAlias(local || accLocal, tag);
      if (!existing.has(a)) {
        added.push({ alias: a, label: label || tag, kind: "plus", created_at: new Date().toISOString() });
      }
    }
    return [...list, ...added];
  });

  return NextResponse.json({ account: email, added: added.length, aliases: added, total: total.length });
}

export async function DELETE(req) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const email = activeEmail(req);
  if (!email || !getAccount(email)) return NextResponse.json({ error: "NO_ACTIVE_ACCOUNT" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const alias = searchParams.get("alias");
  const remaining = await mutateAliases(email, (list) => list.filter((a) => a.alias !== alias));
  return NextResponse.json({ ok: true, remaining: remaining.length });
}
