import { NextResponse } from "next/server";
import { checkPassword, sessionCookieName, createSessionToken, sessionCookieOptions } from "../../../lib/auth.js";

// Rate limit sederhana per IP (in-memory).
const WINDOW_MS = 10 * 60 * 1000; // 10 menit
const MAX_FAILS = 5;
const fails = new Map(); // ip -> { count, firstFail }

function clientIp(req) {
  const fwd = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return fwd || req.headers.get("cf-connecting-ip") || "unknown";
}

function isBlocked(ip) {
  const rec = fails.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.firstFail > WINDOW_MS) {
    fails.delete(ip);
    return false;
  }
  return rec.count >= MAX_FAILS;
}

function recordFail(ip) {
  const rec = fails.get(ip);
  if (!rec || Date.now() - rec.firstFail > WINDOW_MS) {
    fails.set(ip, { count: 1, firstFail: Date.now() });
  } else {
    rec.count += 1;
  }
}

export async function POST(req) {
  const ip = clientIp(req);

  if (isBlocked(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan gagal. Coba lagi dalam 10 menit." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!checkPassword(body.password || "")) {
    recordFail(ip);
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), createSessionToken(), sessionCookieOptions());
  return res;
}
