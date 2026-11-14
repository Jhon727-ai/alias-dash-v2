import { NextResponse } from "next/server";
import { sessionCookieName } from "../../../lib/auth.js";

// Stateless session: cukup clear cookie-nya di sisi browser.
// POST dipake oleh form nav logout (redirect balik ke /login), tetap bisa dipanggil API caller.
function clear(res) {
  res.cookies.set(sessionCookieName(), "", { maxAge: 0, path: "/" });
  return res;
}

export async function POST(req) {
  // form submit: 303 + Location relatif via header (NextResponse.redirect wajib absolute URL,
  // dan req.url di-behind-tunnel = internal host -> makanya susun Location manual).
  // API caller (fetch/JSON): balikin JSON.
  const isForm = (req.headers.get("content-type") || "").includes("form") ||
                 (req.headers.get("accept") || "").includes("text/html");
  const res = isForm ? new NextResponse(null, { status: 303 }) : NextResponse.json({ ok: true });
  if (isForm) res.headers.set("Location", "/login");
  return clear(res);
}
