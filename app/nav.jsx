"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Account switcher global — set cookie active_account, reload halaman.
export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [active, setActive] = useState("");
  const load = () =>
    fetch("/api/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || []); setActive(d.active_account || ""); })
      .catch(() => {});
  useEffect(() => { load(); }, []);
  return { accounts, active, reload: load };
}

export async function switchAccount(email) {
  await fetch("/api/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  window.location.reload();
}

export default function NAV({ accounts, active, showSwitcher = true }) {
  const [open, setOpen] = useState(false);
  return (
    <nav>
      <span>Alias Dash v2</span>
      <Link href="/dashboard">Aliases</Link>
      <Link href="/inbox">Inbox</Link>
      <Link href="/settings">Settings</Link>
      {showSwitcher && accounts.length > 0 && (
        <div style={{ position: "relative", marginLeft: 8 }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{ background:"#222", border:"1px solid #444", color: active ? "#81c784" : "#ef5350", padding:"4px 10px", borderRadius:4, fontSize:12, cursor:"pointer", fontFamily:"monospace" }}>
            {active || "pilih akun"} ▾
          </button>
          {open && (
            <div style={{ position:"absolute", top:"110%", left:0, background:"#1c1c1c", border:"1px solid #444", borderRadius:4, minWidth:220, zIndex:50 }}>
              {accounts.map(a => (
                <div key={a.email}
                  onClick={() => { setOpen(false); if (a.email !== active) switchAccount(a.email); }}
                  style={{ display:"flex", justifyContent:"space-between", gap:8, padding:"8px 12px", cursor:"pointer", fontSize:12, color: a.email === active ? "#4fc3f7" : "#ccc" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#262626"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{ fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis" }}>{a.email}</span>
                  <span style={{ color: a.connected ? "#66bb6a" : "#ef5350", fontSize:10, whiteSpace:"nowrap" }}>{a.connected ? "✓" : "✗"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <form method="post" action="/api/logout" style={{ marginLeft:"auto" }}>
        <button type="submit" style={{ background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:13, padding:0 }}>Logout</button>
      </form>
    </nav>
  );
}
