import { NextResponse } from "next/server";

const SESSION_COOKIE = "alias_dash_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

// Runtime Web (Edge) — HMAC via Web Crypto, HMAC-SHA256 sama dengan lib/auth.js (Node crypto).
function hex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

async function verifyToken(token, password) {
  if (!token || !password) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(ts)) return false;
  const expected = await hmac(ts, password);
  if (expected.length !== sig.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  const age = Date.now() - parseInt(ts, 10);
  return age >= 0 && age <= SESSION_TTL_MS;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const token = match ? match[1] : "";
  const password = process.env.DASH_PASSWORD || "";

  const valid = await verifyToken(token, password);
  if (!valid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/login|api/gmail|_next|favicon).*)"],
};
