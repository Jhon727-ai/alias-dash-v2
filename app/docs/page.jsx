import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Publik — tidak butuh login. Render API.md jadi HTML.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alias Dash — API Docs",
};

function renderMarkdown() {
  const file = path.join(process.cwd(), "API.md");
  let md;
  try {
    md = fs.readFileSync(file, "utf8");
  } catch {
    // fallback utk standalone build (tracing root beda)
    md = fs.readFileSync(path.join(process.cwd(), "..", "..", "API.md"), "utf8");
  }
  return marked.parse(md, { gfm: true, breaks: false });
}

export default function DocsPage() {
  const html = renderMarkdown();
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Alias Dash — API Docs</title>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:ui-monospace,monospace;background:#111;color:#e0e0e0;line-height:1.6}
          .wrap{max-width:880px;margin:0 auto;padding:32px 20px 80px}
          .topbar{position:sticky;top:0;background:rgba(17,17,17,.95);border-bottom:1px solid #333;padding:12px 20px;display:flex;gap:16px;align-items:center;z-index:10}
          .topbar span{font-size:14px;font-weight:600;color:#4fc3f7}
          .topbar a{color:#aaa;font-size:13px}
          .topbar a:hover{color:#e0e0e0;text-decoration:none}
          h1{font-size:22px;color:#fff;margin:24px 0 12px;border-bottom:1px solid #333;padding-bottom:8px}
          h2{font-size:18px;color:#4fc3f7;margin:32px 0 12px;border-bottom:1px solid #222;padding-bottom:6px}
          h3{font-size:15px;color:#fff;margin:24px 0 8px}
          p{margin:8px 0;font-size:14px;color:#ccc}
          ul,ol{margin:8px 0 8px 22px;font-size:14px;color:#ccc}
          li{margin:3px 0}
          a{color:#4fc3f7}
          code{background:#1e1e1e;border:1px solid #333;border-radius:3px;padding:1px 5px;font-size:12.5px;color:#81c784}
          pre{background:#161616;border:1px solid #333;border-radius:6px;padding:14px;overflow-x:auto;margin:10px 0 16px}
          pre code{background:none;border:none;padding:0;color:#e0e0e0;font-size:12.5px}
          table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0 16px}
          th{text-align:left;color:#888;font-size:11px;padding:6px 8px;border-bottom:1px solid #444;background:#1a1a1a}
          td{padding:7px 8px;border-bottom:1px solid #262626;vertical-align:top;color:#ccc}
          tr:hover td{background:#1a1a1a}
          blockquote{border-left:3px solid #4fc3f7;background:#16202a;padding:8px 14px;margin:10px 0;color:#9fd8fb;font-size:13px;border-radius:0 4px 4px 0}
          hr{border:none;border-top:1px solid #262626;margin:24px 0}
          .footer{margin-top:48px;padding-top:16px;border-top:1px solid #262626;color:#666;font-size:12px}
        `}</style>
      </head>
      <body>
        <div className="topbar">
          <span>Alias Dash v2</span>
          <a href="/docs">Docs</a>
          <a href="/login" style={{ marginLeft: "auto" }}>Dashboard Login →</a>
        </div>
        <div className="wrap" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="wrap footer">
          Alias Dash v2 — API documentation · sumber: <code>API.md</code> di repo
        </div>
      </body>
    </html>
  );
}
