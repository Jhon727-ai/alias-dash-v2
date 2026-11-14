"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import NAV, { useAccounts } from "../nav";

const DOT_PREVIEW = 20;

export default function AliasesPage() {
  const { accounts, active, reload } = useAccounts();
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("dot");
  const [tag, setTag] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [generating, setGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState("");
  const [showAllDots, setShowAllDots] = useState(false);

  const load = useCallback(async () => {
    if (!active) { setLoading(false); return; }
    const r = await fetch("/api/aliases", { credentials: "include" });
    if (!r.ok) { setLoading(false); return; }
    const d = await r.json();
    setAliases(d.aliases || []);
    setLoading(false);
  }, [active]);

  useEffect(() => { load(); }, [load]);

  async function generate(e) {
    e.preventDefault();
    setGenerating(true); setMsg("");
    const r = await fetch("/api/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, tag, label }),
      credentials: "include",
    });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "Gagal"); setGenerating(false); return; }
    setMsg(d.error || `+${d.added} alias`);
    setGenerating(false);
    load();
    if (!d.error) { setTag(""); setLabel(""); }
  }

  async function remove(alias) {
    await fetch(`/api/aliases?alias=${encodeURIComponent(alias)}`, { method: "DELETE", credentials: "include" });
    load();
  }

  async function scanAll() {
    setScanning(true);
    setScanMsg("Nyiapin query Gmail...");
    const r = await fetch("/api/inbox/all?max=200", { credentials: "include" });
    if (!r.ok || !r.headers.get("content-type")?.includes("application/json")) {
      setScanMsg("Gagal scan (login ulang / token?)"); setScanning(false); return;
    }
    const d = await r.json();
    if (d.error) { setScanMsg(`Error: ${d.error}`); setScanning(false); return; }
    setStats(d.stats || {});
    setScanMsg(`Scan selesai: ${d.scanned} email dicek, ${d.matched_aliases} alias match.`);
    setScanning(false);
    load();
  }

  function copy(alias) {
    navigator.clipboard.writeText(`${alias}@${active.split("@")[1] || "gmail.com"}`).catch(()=>{});
  }

  const byKind = (k) => aliases.filter(a => a.kind === k);
  const statFor = (a) => stats[a.alias] || stats[a.alias.toLowerCase()];
  const fmtDate = (s) => s ? new Date(s).toLocaleString("id", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "";

  const f = filter.trim().toLowerCase();
  const filtered = (list) => f
    ? list.filter(a => a.alias.toLowerCase().includes(f) || (a.label||"").toLowerCase().includes(f))
    : list;

  const plusList = useMemo(() => filtered(byKind("plus")), [aliases, filter]); // eslint-disable-line
  const dotList = useMemo(() => filtered(byKind("dot")), [aliases, filter]); // eslint-disable-line
  const dotShown = showAllDots || f ? dotList : dotList.slice(0, DOT_PREVIEW);

  const activeAcc = accounts.find(a => a.email === active);

  return (
    <>
      <NAV accounts={accounts} active={active} />
      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px" }}>
        <h1>Daftar Alias {active && <span style={{ color:"#81c784", fontSize:13 }}>@ {active}</span>}</h1>

        {!active && accounts.length === 0 && (
          <div className="card" style={{ textAlign:"center", padding:32 }}>
            <p style={{ color:"#888", marginBottom:16 }}>Belum ada akun Gmail terdaftar.</p>
            <a href="/settings" className="btn btn-primary">Tambah Akun di Settings</a>
          </div>
        )}
        {active && !activeAcc?.connected && (
          <div className="card" style={{ textAlign:"center", padding:24 }}>
            <p style={{ color:"#ef5350", marginBottom:8 }}>⚠ Akun {active} belum connect Gmail</p>
            <a href="/settings" className="btn btn-primary">Connect di Settings</a>
          </div>
        )}

        {active && activeAcc?.connected && (
        <>
        <div className="card">
          <h1 style={{ fontSize:14, marginBottom:12 }}>Generate Alias Baru</h1>
          <form onSubmit={generate}>
            <div className="row">
              <select className="input" style={{ width:120 }} value={mode} onChange={e=>setMode(e.target.value)}>
                <option value="dot">Dot Trick</option>
                <option value="plus">Plus (+) Tag</option>
              </select>
              {mode === "plus" && (
                <input className="input" placeholder="tag, misal: shopee" value={tag} onChange={e=>setTag(e.target.value)} style={{ flex:1 }} />
              )}
              <input className="input" placeholder="label opsional (misal: online shop)" value={label} onChange={e=>setLabel(e.target.value)} style={{ flex:2 }} />
              <button className="btn btn-primary" disabled={generating}>
                {generating ? "Generate..." : mode === "dot" ? `Generate Dot (${byKind("dot").length})` : "Add Plus Alias"}
              </button>
            </div>
            {msg && <p style={{ color: msg.startsWith("+") ? "#66bb6a" : "#ef5350", marginTop:8 }}>{msg}</p>}
          </form>
        </div>

        <div className="card">
          <div className="row">
            <button className="btn btn-primary" onClick={scanAll} disabled={scanning}>
              {scanning ? "Scanning..." : "Cek Semua Alias"}
            </button>
            <input className="input" placeholder="cari alias / label..." value={filter} onChange={e=>setFilter(e.target.value)} style={{ flex:1, maxWidth:280 }} />
          </div>
          {scanMsg && <p style={{ fontSize:12, color:"#4fc3f7", marginTop:8 }}>{scanMsg}</p>}
        </div>

        {loading ? <p>Loading...</p> : (
          <>
            <div className="card">
              <h1 style={{ fontSize:13, color:"#888", marginBottom:8 }}>Plus Aliases ({plusList.length}{f ? `/${byKind("plus").length}` : ""})</h1>
              {plusList.length === 0 ? <p style={{ color:"#555" }}>{f ? "Gak ada yang match." : "Belum ada plus alias."}</p> : (
                <table>
                  <thead><tr><th>Alias</th><th>Label</th><th>Created</th><th>Emails</th><th>Terakhir</th><th></th></tr></thead>
                  <tbody>
                    {plusList.map(a => {
                      const s = statFor(a);
                      return (
                        <tr key={a.alias}>
                          <td className="mono" style={{ color:"#4fc3f7" }}>{a.alias}</td>
                          <td>{a.label || "—"}</td>
                          <td style={{ color:"#666", fontSize:12 }}>{new Date(a.created_at).toLocaleDateString("id")}</td>
                          <td>{s ? <span className="badge badge-plus">{s.count}</span> : <span style={{ color:"#555", fontSize:11 }}>{a.last_used_at ? "—" : "belum"}</span>}</td>
                          <td style={{ color:"#666", fontSize:11 }}>{a.last_used_at ? fmtDate(a.last_used_at) : "—"}</td>
                          <td>
                            <button className="btn" style={{ background:"transparent", padding:"2px 6px", fontSize:11 }} onClick={()=>copy(a.alias)}>copy</button>
                            <button className="btn btn-danger" style={{ padding:"2px 6px", fontSize:11 }} onClick={()=>remove(a.alias)}>del</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h1 style={{ fontSize:13, color:"#888", marginBottom:8 }}>
                Dot Trick Aliases ({dotList.length}{f ? `/${byKind("dot").length}` : ""}) — semua masuk inbox {active}
              </h1>
              {dotList.length === 0 ? (
                <p style={{ color:"#555" }}>{f ? "Gak ada yang match." : 'Klik "Generate Dot" untuk bikin semua kombinasi dot.'}</p>
              ) : (
                <>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {dotShown.map(a => {
                      const s = statFor(a);
                      return (
                        <span key={a.alias} style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#1a3a1a", color:"#81c784", padding:"3px 8px", borderRadius:4, fontSize:12, fontFamily:"monospace" }}>
                          {a.alias}
                          {s && <span style={{ background:"#0d260d", borderRadius:3, fontSize:10, padding:"1px 4px" }}>{s.count}</span>}
                          <button style={{ background:"none", border:"none", color:"#ef5350", cursor:"pointer", padding:0, fontSize:13, lineHeight:1 }} onClick={()=>remove(a.alias)}>×</button>
                        </span>
                      );
                    })}
                  </div>
                  {!f && dotList.length > DOT_PREVIEW && (
                    <button className="btn" style={{ marginTop:10, fontSize:12, background:"transparent", border:"1px solid #333", color:"#888" }} onClick={()=>setShowAllDots(v=>!v)}>
                      {showAllDots ? `▲ Sembunyikan (tampil ${DOT_PREVIEW})` : `▼ Tampilkan semua ${dotList.length} alias`}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </>
  );
}
