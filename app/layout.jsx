export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Alias Dash</title>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:ui-monospace,monospace;background:#111;color:#e0e0e0;min-height:100vh}
          a{color:#4fc3f7;text-decoration:none}
          a:hover{text-decoration:underline}
          .btn{display:inline-block;padding:6px 14px;border:none;border-radius:4px;cursor:pointer;font-size:13px}
          .btn-primary{background:#4fc3f7;color:#000;font-weight:600}
          .btn-primary:hover{background:#81d4fa}
          .btn-danger{background:#ef5350;color:#fff}
          .btn-danger:hover{background:#f44336}
          .card{background:#1c1c1c;border:1px solid #333;border-radius:6px;padding:16px;margin-bottom:12px}
          .input{background:#222;border:1px solid #444;color:#e0e0e0;padding:7px 10px;border-radius:4px;font-size:13px;width:100%}
          .input:focus{outline:none;border-color:#4fc3f7}
          .label{font-size:11px;color:#888;margin-bottom:4px;display:block}
          .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
          .row + .row{margin-top:8px}
          .err{color:#ef5350;font-size:12px;margin:6px 0}
          .ok{color:#66bb6a;font-size:12px;margin:6px 0}
          .mono{font-family:ui-monospace,monospace}
          .tag{padding:2px 8px;border-radius:3px;font-size:11px;background:#333;color:#aaa}
          .tag.dot{background:#1a3a1a;color:#81c784}
          .tag.plus{background:#1a2a3a;color:#4fc3f7}
          .msg-item{padding:10px 0;border-bottom:1px solid #222}
          .msg-item:last-child{border-bottom:none}
          .msg-from{color:#aaa;font-size:12px}
          .msg-subject{color:#e0e0e0;font-size:13px;margin:3px 0}
          .msg-snippet{color:#666;font-size:11px}
          nav{background:#1c1c1c;border-bottom:1px solid #333;padding:12px 20px;display:flex;gap:20px;align-items:center}
          nav span{font-size:14px;font-weight:600;color:#4fc3f7}
          nav a{color:#aaa;font-size:13px}
          nav a:hover{color:#e0e0e0;text-decoration:none}
          h1{font-size:16px;font-weight:600;margin-bottom:16px;color:#fff}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{text-align:left;color:#888;font-size:11px;padding:6px 8px;border-bottom:1px solid #333}
          td{padding:8px;vertical-align:top}
          tr:hover td{background:#1a1a1a}
          .badge{padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600}
          .badge-dot{background:#1a3a1a;color:#81c784}
          .badge-plus{background:#1a2a3a;color:#4fc3f7}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
