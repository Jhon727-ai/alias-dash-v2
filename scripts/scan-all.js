#!/usr/bin/env node
// Cron scan semua akun alias-dash-v2 — update last_used_at + stats per alias.
// Dipanggil tiap jam via crontab. Tanpa auth (localhost-only logic di sini).
import fs from "node:fs";
import { listAccounts, hasToken, readAliases, mutateAliases, touchAccount } from "../lib/accounts.js";
import { getGmail } from "../lib/gmail.js";

const STATE_PATH = "/root/alias-dash-v2/data/scan_state.json";
const MAX_EMAILS = 200;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")); } catch { return {}; }
}
function writeState(s) {
  const tmp = `${STATE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STATE_PATH);
}

function extractAddresses(header) {
  const out = [];
  const re = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+)/g;
  let m;
  while ((m = re.exec(header || "")) !== null) out.push(m[1].toLowerCase());
  return out;
}

async function scanAccount(acc) {
  const email = acc.email;
  if (!hasToken(email)) {
    return { email, skipped: "no_token" };
  }
  try {
    const gmail = await getGmail(email);
    const local = email.split("@")[0].replace(/\./g, "");
    const q = `to:${local} OR to:${email}`;
    const list = await gmail.users.messages.list({ userId: "me", q, maxResults: MAX_EMAILS });
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

    const now = new Date().toISOString();
    if (Object.keys(perAlias).length > 0) {
      await mutateAliases(email, (list2) =>
        list2.map((a) =>
          perAlias[a.alias.toLowerCase()]
            ? { ...a, last_used_at: perAlias[a.alias.toLowerCase()].last_date || now }
            : a
        )
      );
    }
    await touchAccount(email, now);

    return { email, scanned: msgs.length, matched: Object.keys(perAlias).length };
  } catch (e) {
    return { email, error: e.message };
  }
}

async function main() {
  const state = readState();
  const accounts = listAccounts().filter(a => a.connected);
  const results = [];
  for (const acc of accounts) {
    const r = await scanAccount(acc);
    results.push(r);
    console.log(`[${new Date().toISOString()}]`, JSON.stringify(r));
  }
  state.last_run = new Date().toISOString();
  state.results = results;
  writeState(state);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
