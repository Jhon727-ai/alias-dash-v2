// Gmail API callback handler — menerima redirect dari Google, tampilkan code untuk user paste.
// (User copy code, paste di halaman /settings buat di-exchange jadi token.)

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const html = `
    <html><body style="font-family:monospace;background:#111;color:#e0e0e0;padding:40px">
      <h2 style="color:#4fc3f7">Gmail OAuth Callback</h2>
      ${error ? `<p style="color:#ef5350">Error: ${error}</p>` : ""}
      ${code ? `<p>Copy code di bawah, paste ke halaman <b>Settings</b>:</p>
      <textarea readonly style="width:100%;height:80px;background:#222;color:#81c784;border:1px solid #444;padding:10px">${code}</textarea>
      <p><a href="/settings" style="color:#4fc3f7">← Back to Settings</a></p>` : "<p>No code received.</p>"}
    </body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
