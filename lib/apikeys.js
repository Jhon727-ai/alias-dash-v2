// API key store — hashed SHA-256, plaintext cuma nampil sekali saat create.
// File: data/apikeys.json -> [{ id, name, key_hash, created_at, last_used_at }]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.V2_DATA_DIR || "/root/alias-dash-v2/data";
const KEYS_PATH = path.join(DATA_DIR, "apikeys.json");

function readKeys() {
  if (!fs.existsSync(KEYS_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(KEYS_PATH, "utf-8")); } catch { return []; }
}

let keysQueue = Promise.resolve();
function enqueueKeys(fn) {
  const task = keysQueue.then(async () => {
    const list = readKeys();
    const next = await fn(list);
    if (next !== undefined) {
      const tmp = `${KEYS_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, KEYS_PATH);
    }
    return next;
  });
  keysQueue = task.catch(() => {});
  return task;
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function timingSafeHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Buat key baru: return plaintext SEKALI ini aja.
export async function createApiKey(name) {
  const raw = `ak_${crypto.randomBytes(24).toString("hex")}`;
  const id = crypto.randomUUID();
  await enqueueKeys((list) => [
    ...list,
    { id, name: String(name || "unnamed").slice(0, 64), key_hash: sha256(raw), created_at: new Date().toISOString(), last_used_at: null },
  ]);
  return { id, key: raw };
}

export async function revokeApiKey(idOrName) {
  return enqueueKeys((list) => list.filter(k => k.id !== idOrName && k.name !== idOrName));
}

export function listApiKeys() {
  return readKeys().map(k => ({
    id: k.id,
    name: k.name,
    created_at: k.created_at,
    last_used_at: k.last_used_at,
  }));
}

// Verifikasi bearer key. Kalau valid, update last_used_at (async fire-and-forget).
export function verifyApiKey(raw) {
  if (!raw || typeof raw !== "string") return false;
  const hash = sha256(raw);
  const keys = readKeys();
  const found = keys.find(k => timingSafeHex(k.key_hash, hash));
  if (!found) return false;
  // update last_used (tanpa nunggu, queue sendiri)
  enqueueKeys(list => list.map(k => k.id === found.id ? { ...k, last_used_at: new Date().toISOString() } : k));
  return true;
}
