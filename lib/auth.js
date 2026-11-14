import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { verifyApiKey } from "./apikeys.js";

const SESSION_COOKIE = "alias_dash_session";
const PASSWORD = process.env.DASH_PASSWORD || "";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function hmac(payload) {
  return crypto.createHmac("sha256", PASSWORD).update(payload).digest("hex");
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Cookie format: "<ts_ms>.<hmac_hex(ts_ms)>"
export function createSessionToken() {
  const ts = Date.now().toString();
  return `${ts}.${hmac(ts)}`;
}

export function verifySessionToken(token) {
  if (!token || !PASSWORD) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(ts)) return false;
  if (!timingSafeEqualStr(hmac(ts), sig)) return false;
  const age = Date.now() - parseInt(ts, 10);
  return age >= 0 && age <= SESSION_TTL_MS;
}

export function requireAuth(req) {
  // 1) Bearer API key — pintu kedua buat non-browser client
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (m && verifyApiKey(m[1].trim())) return null;

  if (!PASSWORD) {
    return NextResponse.json({ error: "DASH_PASSWORD belum diset di env" }, { status: 500 });
  }
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match || !verifySessionToken(match[1])) return unauthorized();
  return null; // lolos
}

export function checkPassword(input) {
  if (!PASSWORD || typeof input !== "string") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(PASSWORD);
  if (a.length !== b.length) {
    // tetap burn waktu biar timing-nya konsisten
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    secure: true,
  };
}
