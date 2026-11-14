"use client";
import { useState, useEffect, useMemo } from "react";
import NAV, { useAccounts } from "../nav";

function relDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru aja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd} hari lalu`;
  return d.toLocaleDateString("id", { day:"2-digit", month:"short", year:"numeric" });
}

function parseFrom(from) {
  const m = (from || "").match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "") || m[2], email: m[2] };
  return { name: from || "—", email: from || "" };
}

export default function InboxPage() {
  const { accounts, active } = useAccounts();
  const [aliases, setAliases] = useState([]);
  const [sel, setSel] = useState("");
  const [filter, setFilter] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [noToken, setNoToken] = useState(false);
  const [stats, setStats] = useState({});
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [msgDetail, setMsgDetail] = useState({});
  const [msgLoading, setMsgLoading] = useState(null);

  useEffect(() => {
    if (!active) return;
    setAliases([]); setMessages([]); setSel(""); setErr(""); setNoToken(false);
    fetch("/api/aliases", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list = d.aliases || [];
        setAliases(list);
        const activeSorted = list.filter(a => a.last_used_at)
          .sort((x,y) => (y.last_used_at||"").localeCompare(x.last_used_at||""));
        if (activeSorted.length) setSel(activeSorted[0].alias);
        else if (list.length) setSel(list[0].alias);
      })
      .catch(()=>{});
  }, [active]);

  useEffect(() => {
    if (sel) loadInbox(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const knownActive = aliases.filter(a => a.last_used_at);

  async function scanActive() {
    setScanning(true); setErr("");
    const r = await fetch("/api/inbox/all?max=200", { credentials:"include" });
    if (!r.ok) { setErr("Scan gagal (login ulang / token?)"); setScanning(false); return; }
    const d = await r.json();
    if (d.error) { setErr(d.error); setScanning(false); return; }
    setStats(d.stats || {});
    setScanning(false);
    const ar = await fetch("/api/aliases", { credentials: "include" });
    if (ar.ok) { const ad = await ar.json(); setAliases(ad.aliases || []); }
  }

  async function loadInbox(alias) {
    if (!alias) return;
    setLoading(true); setErr(""); setMessages([]); setExpanded(null);
    const r = await fetch(`/api/inbox?alias=${encodeURIComponent(alias)}&max=50`, { credentials:"include" });
    if (!r.ok || !r.headers.get("content-type")?.includes("application/json")) {
      setErr("Gagal load (login ulang?)"); setLoading(false); return;
    }
    const d = await r.json();
    if (d.error === "NO_TOKEN") { setNoToken(true); setLoading(false); return; }
    if (d.error) { setErr(d.hint ? `${d.error} — ${d.hint}` : d.error); setLoading(false); return; }
    setMessages(d.messages || []);
    setLoading(false);
  }

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!msgDetail[id]) {
      setMsgLoading(id);
      const r = await fetch(`/api/inbox/message?id=${encodeURIComponent(id)}`, { credentials:"include" });
      if (r.ok) { const d = await r.json(); setMsgDetail(prev => ({ ...prev, [id]: d })); }
      else setMsgDetail(prev => ({ ...prev, [id]: { error: "Gagal load body" } }));
      setMsgLoading(null);
    }
  }

  const statFor = (a) => stats[a.alias] || stats[a.alias?.toLowerCase()];

  const visibleAliases = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let list = aliases;
    if (f) list = list.filter(a => a.alias.toLowerCase().includes(f) || (a.label||"").toLowerCase().includes(f));
    const score = (a) => {
      const s = statFor(a);
      const c = s ? s.count : 0;
      const used = a.last_used_at ? 1 : 0;
      return (c > 0 ? 2 : used ? 1 : 0);
    };
    return [...list].sort((x,y) => score(y) - score(x) || x.alias.localeCompare(y.alias));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aliases, filter, stats]);

  const activeAcc = accounts.find(a => a.email === active);

  return (
    <>
      <NAV accounts={accounts} active={active} />
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px" }}>
        <h1>Inbox per Alias {active && <span style={{ color:"#81c784", fontSize:13 }}>@ {active}</span>}</h1>

        {!active && (
          <div className="card" style={{ textAlign:"center", padding:32 }}>
            <p style={{ color:"#888", marginBottom:16 }}>Belum ada akun terdaftar / terpilih.</p>
            <a href="/settings" className="btn btn-primary">Ke Settings</a>
          </div>
        )}

        {active && !activeAcc?.connected && (
          <div className="card" style={{ textAlign:"center", padding:32 }}>
            <p style={{ color:"#ef5350", fontSize:16, marginBottom:8 }}>⚠ Token Gmail {active} belum ada</p>
            <p style={{ color:"#888", fontSize:13, marginBottom:16 }}>Connect dulu di Settings.</p>
            <a href="/settings" className="btn btn-primary">Buka Settings</a>
          </div>
        )}

        {active && activeAcc?.connected && (
        <>
        {noToken && (
          <div className="card" style={{ textAlign:"center", padding:32 }}>
            <p style={{ color:"#ef5350", fontSize:16, marginBottom:8 }}>⚠ Token Gmail belum ada</p>
            <p style={{ color:"#888", fontSize:13, marginBottom:16 }}>Inbox butuh koneksi Gmail. Silakan hubungkan dulu.</p>
            <a href="/settings" className="btn btn-primary">Buka Settings</a>
          </div>
        )}
        {!noToken && err && <p className="err">{err}</p>}
        {!noToken && (
          <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>

          {/* ===== SIDEBAR ALIAS ===== */}
          <div className="card" style={{ flex:"0 0 300px", maxHeight:"70vh", display:"flex", flexDirection:"column", padding:12 }}>
            <div className="row" style={{ marginBottom:8 }}>
              <input className="input" placeholder="cari alias / label..." value={filter} onChange={e=>setFilter(e.target.value)} style={{ flex:1 }} />
            </div>
            <div className="row" style={{ marginBottom:8 }}>
              <button className="btn" onClick={scanActive} disabled={scanning} style={{ fontSize:12 }}>
                {scanning ? "Scan..." : "Cek Alias Aktif"}
              </button>
            </div>
            <div style={{ overflowY:"auto", flex:1 }}>
              {visibleAliases.map(a => {
                const s = statFor(a);
                const count = s ? s.count : null;
                const isActive = sel === a.alias;
                return (
                  <div key={a.alias}
                    onClick={()=>setSel(a.alias)}
                    style={{
                      display:"flex", alignItems:"center", gap:6, padding:"6px 8px", borderRadius:4,
                      cursor:"pointer", fontSize:12, fontFamily:"monospace",
                      background: isActive ? "#1a2a3a" : "transparent",
                      color: isActive ? "#4fc3f7" : "#ccc",
                      borderLeft: isActive ? "2px solid #4fc3f7" : "2px solid transparent",
                    }}>
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.alias}{a.label ? <span style={{ color:"#666" }}> · {a.label}</span> : null}
                    </span>
                    {count > 0 && <span className="badge badge-plus">{count}</span>}
                    {count === null && a.last_used_at && <span style={{ fontSize:10, color:"#81c784" }}>aktif</span>}
                  </div>
                );
              })}
              {visibleAliases.length === 0 && <p style={{ color:"#555", fontSize:12 }}>Gak ada yang match.</p>}
            </div>
            <p style={{ fontSize:10, color:"#555", marginTop:6 }}>
              {visibleAliases.length} dari {aliases.length} alias{knownActive.length > 0 ? ` · ${knownActive.length} aktif` : ""}
            </p>
          </div>

          {/* ===== EMAIL LIST ===== */}
          <div className="card" style={{ flex:"1 1 500px", minHeight:300 }}>
            <div className="row" style={{ marginBottom:10 }}>
              <strong style={{ color:"#4fc3f7", fontFamily:"monospace", fontSize:13 }}>{sel || "—"}</strong>
              <button className="btn" onClick={()=>loadInbox(sel)} disabled={!sel || loading} style={{ marginLeft:"auto", fontSize:12 }}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {!sel && <p style={{ color:"#555" }}>Pilih alias dari kiri.</p>}
            {loading && <p style={{ color:"#888" }}>Loading...</p>}
            {!loading && sel && messages.length === 0 && <p style={{ color:"#555" }}>Belum ada email di alias ini.</p>}
            {!loading && sel && messages.length > 0 && (
              <p style={{ fontSize:11, color:"#666", marginBottom:8 }}>
                Nampilin {messages.length} email terakhir
              </p>
            )}
            {messages.map(m => {
              const from = parseFrom(m.from);
              const isOpen = expanded === m.id;
              const detail = msgDetail[m.id];
              return (
                <div key={m.id} className="msg-item" style={{ cursor:"pointer" }} onClick={()=>toggleExpand(m.id)}>
                  <div style={{ display:"flex", gap:8, alignItems:"baseline" }}>
                    <div className="msg-from" style={{ flex:1 }}>
                      <strong style={{ color:"#ccc" }}>{from.name}</strong>
                      <span style={{ color:"#555" }} title={from.email}> {from.email !== from.name ? `<${from.email}>` : ""}</span>
                    </div>
                    <div style={{ color:"#666", fontSize:10, whiteSpace:"nowrap" }}>{relDate(m.date)}</div>
                  </div>
                  <div className="msg-subject" style={{ fontWeight:600 }}>{m.subject || "(no subject)"}</div>
                  {!isOpen && <div className="msg-snippet">{m.snippet}</div>}

                  {isOpen && (
                    <div style={{
                      marginTop:8, padding:10, background:"#161616", borderRadius:4,
                      border:"1px solid #2a2a2a", fontSize:12, whiteSpace:"pre-wrap", wordBreak:"break-word",
                      maxHeight:400, overflowY:"auto", color:"#bbb",
                    }}>
                      {msgLoading === m.id ? "Loading body..." :
                       detail?.error ? <span style={{ color:"#ef5350" }}>{detail.error}</span> :
                       detail?.body ? detail.body :
                       "—"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* ===== END EMAIL LIST ===== */}
        </div>
        )}
        </>
        )}
      </div>
    </>
  );
}
