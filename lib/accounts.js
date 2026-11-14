// Store akun Gmail multi-user + alias per-akun.
// Struktur file:
//   data/accounts.json          -> [{ email, label, connected, added_at, last_used_at }]
//   data/tokens/<email>.json    -> OAuth token per akun (0600)
//   data/aliases/<email>.json   -> array alias per akun (0600)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.V2_DATA_DIR || "/root/alias-dash-v2/data";
const ACCOUNTS_PATH = path.join(DATA_DIR, "accounts.json");
const TOKENS_DIR = path.join(DATA_DIR, "tokens");
const ALIASES_DIR = path.join(DATA_DIR, "aliases");

for (const d of [DATA_DIR, TOKENS_DIR, ALIASES_DIR]) fs.mkdirSync(d, { recursive: true });

const safeName = (email) => email.replace(/[^a-zA-Z0-9._@-]/g, "_");
const tokenPath = (email) => path.join(TOKENS_DIR, `${safeName(email)}.json`);
const aliasPath = (email) => path.join(ALIASES_DIR, `${safeName(email)}.json`);

// --- accounts.json ---
function readAccounts() {
  if (!fs.existsSync(ACCOUNTS_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, "utf-8")); } catch { return []; }
}

let accountsQueue = Promise.resolve();
function enqueueAccounts(fn) {
  const task = accountsQueue.then(async () => {
    const list = readAccounts();
    const next = await fn(list);
    if (next !== undefined) {
      const tmp = `${ACCOUNTS_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, ACCOUNTS_PATH);
    }
    return next;
  });
  accountsQueue = task.catch(() => {});
  return task;
}

export function listAccounts() {
  return readAccounts().map(a => ({
    email: a.email,
    label: a.label || "",
    connected: fs.existsSync(tokenPath(a.email)),
    added_at: a.added_at,
    last_used_at: a.last_used_at || null,
  }));
}

export function getAccount(email) {
  return readAccounts().find(a => a.email === email) || null;
}

export async function addAccount(email, label = "") {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw new Error("Email gak valid");
  return enqueueAccounts((list) => {
    if (list.find(a => a.email === emailNorm)) return undefined; // sudah ada
    return [...list, { email: emailNorm, label, added_at: new Date().toISOString() }];
  });
}

export async function removeAccount(email) {
  return enqueueAccounts((list) => {
    const next = list.filter(a => a.email !== email);
    // hapus file turunannya
    for (const p of [tokenPath(email), aliasPath(email)]) {
      try { fs.unlinkSync(p); } catch {}
    }
    return next;
  });
}

export async function touchAccount(email, iso) {
  return enqueueAccounts((list) =>
    list.map(a => a.email === email ? { ...a, last_used_at: iso || new Date().toISOString() } : a)
  );
}

// --- token per akun ---
export function hasToken(email) { return fs.existsSync(tokenPath(email)); }

export function saveToken(email, tokens) {
  const p = tokenPath(email);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, p);
}

export function readToken(email) {
  return JSON.parse(fs.readFileSync(tokenPath(email), "utf-8"));
}

export function deleteToken(email) {
  try { fs.unlinkSync(tokenPath(email)); return true; } catch { return false; }
}

// state untuk OAuth flow (proteksi CSRF + tahu flow-nya akun mana)
const FLOWS_PATH = path.join(DATA_DIR, "oauth_flows.json");
export function createState(email) {
  const state = crypto.randomBytes(16).toString("hex");
  let flows = {};
  try { flows = JSON.parse(fs.readFileSync(FLOWS_PATH, "utf-8")); } catch {}
  flows[state] = { email, created: Date.now() };
  // buang flow > 15 menit
  for (const [k, v] of Object.entries(flows)) if (Date.now() - v.created > 15 * 60 * 1000) delete flows[k];
  fs.writeFileSync(FLOWS_PATH, JSON.stringify(flows, null, 2), { mode: 0o600 });
  return state;
}
export function readState(state) {
  try {
    const flows = JSON.parse(fs.readFileSync(FLOWS_PATH, "utf-8"));
    const f = flows[state];
    if (!f || Date.now() - f.created > 15 * 60 * 1000) return null;
    delete flows[state];
    fs.writeFileSync(FLOWS_PATH, JSON.stringify(flows, null, 2), { mode: 0o600 });
    return f;
  } catch { return null; }
}

// --- alias per akun ---
export function readAliases(email) {
  const p = aliasPath(email);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return []; }
}

let aliasQueues = new Map(); // email -> promise chain (biar antar-akun ga saling blokir)
function enqueueAliases(email, fn) {
  const key = safeName(email);
  const prev = aliasQueues.get(key) || Promise.resolve();
  const task = prev.then(async () => {
    const list = readAliases(email);
    const next = await fn(list);
    if (next !== undefined) {
      const p = aliasPath(email);
      const tmp = `${p}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, p);
    }
    return next;
  });
  aliasQueues.set(key, task.catch(() => {}));
  return task;
}

export async function mutateAliases(email, fn) {
  return enqueueAliases(email, fn);
}
