// Full body message — scoped akun aktif.
import { NextResponse } from "next/server";
import { activeEmail } from "../../../../lib/active.js";
import { requireAuth } from "../../../../lib/auth.js";
import { getGmail } from "../../../../lib/gmail.js";
import { hasToken } from "../../../../lib/accounts.js";


function extractBody(payload) {
  // Cari part text/plain — rekursif karena Gmail nesting multipart bisa dalam
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  for (const part of payload.parts || []) {
    const found = extractBody(part);
    if (found) return found;
  }
  // fallback: body utama kalau ada (kadang text/html langsung)
  if (payload.body?.data && payload.mimeType?.startsWith("text/")) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  return "";
}

function stripHtml(s) {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET(req) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const email = activeEmail(req);
  if (!email || !hasToken(email)) {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Param id wajib" }, { status: 400 });

  try {
    const gmail = await getGmail(email);
    const full = await gmail.users.messages.get({ userId: "me", id, format: "full" });
    const headers = full.data.payload?.headers || [];
    const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
    const rawBody = extractBody(full.data.payload) || full.data.snippet || "";
    const body = stripHtml(rawBody);
    return NextResponse.json({
      id,
      from: get("From"),
      subject: get("Subject"),
      date: get("Date"),
      snippet: full.data.snippet || "",
      body,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
