"use client";
import { useState, useEffect } from "react";
import NAV, { useAccounts, switchAccount } from "../nav";

function Check({ done, children }) {
  return (
    <li style={{ color: done ? "#66bb6a" : "#999", listStyle: "none", display:"flex", gap:8, alignItems:"baseline" }}>
      <span style={{ fontWeight:700 }}>{done ? "✓" : "○"}</span>
      <span>{children}</span>
    </li>
  );
}

export default function SettingsPage() {
  const { accounts, active, reload } = useAccounts();
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [flowEmail, setFlowEmail] = useState(""); // akun yang lagi di-OAuth
  const [state, setState] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [master, setMaster] = useState("");

  useEffect(() => {
    setRedirectUri(`${window.location.origin}/api/gmail/callback`);
    fetch("/api/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => setMaster(d.master || ""))
      .catch(() => {});
  }, []);

  async function addAccount(e) {
    e.preventDefault();
    setLoading(true); setMsg(""); setMsgOk(false);
    const r = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, label: newLabel }),
      credentials: "include",
    });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); setLoading(false); return; }
    setMsg(`Akun ${newEmail} didaftarkan. Sekarang connect Gmail-nya.`);
    setMsgOk(true);
    setNewEmail(""); setNewLabel("");
    reload();
    setLoading(false);
  }

  async function removeAccount(email) {
    if (!confirm(`Hapus akun ${email}? Token + semua aliasnya kehapus.`)) return;
    const r = await fetch(`/api/accounts?email=${encodeURIComponent(email)}`, { method: "DELETE", credentials: "include" });
    const d = await r.json();
    setMsg(d.error || `Akun ${email} dihapus.`);
    setMsgOk(!d.error);
    reload();
  }

  async function startOAuth(email) {
    setLoading(true); setMsg(""); setMsgOk(false);
    const r = await fetch(`/api/gmail/authurl?email=${encodeURIComponent(email)}&redirect_uri=${encodeURIComponent(redirectUri)}`, { credentials: "include" });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); setLoading(false); return; }
    setAuthUrl(d.auth_url);
    setFlowEmail(email);
    // extract state dari URL buat exchange
    const m = d.auth_url.match(/[?&]state=([^&]+)/);
    setState(m ? decodeURIComponent(m[1]) : "");
    setMsg(`Buka URL, login sebagai ${email}, approve, copy redirect URL.`);
    setLoading(false);
  }

  async function exchange() {
    setLoading(true);
    const r = await fetch("/api/gmail/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
      credentials: "include",
    });
    const d = await r.json();
    setMsg(d.error || `Gmail ${d.email} connected!`);
    setMsgOk(!d.error);
    if (!d.error) {
      setAuthUrl(""); setCode(""); setFlowEmail("");
      reload();
      // otomatis jadikan akun baru aktif
      switchAccount(d.email);
    }
    setLoading(false);
  }

  async function disconnect(email) {
    if (!confirm(`Putuskan Gmail ${email}? (alias tetep tersimpan)`)) return;
    setLoading(true);
    const r = await fetch("/api/gmail/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    const d = await r.json();
    setMsg(d.error || `Gmail ${email} terputus.`);
    setMsgOk(!d.error);
    reload();
    setLoading(false);
  }

  const connectedCount = accounts.filter(a => a.connected).length;

  // --- API keys state ---
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [freshKey, setFreshKey] = useState(null); // plaintext sekali tampil
  const loadKeys = () =>
    fetch("/api/apikeys", { credentials: "include" })
      .then(r => r.json())
      .then(d => setApiKeys(d.keys || []))
      .catch(() => {});
  useEffect(() => { loadKeys(); }, []);

  async function createKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setLoading(true);
    const r = await fetch("/api/apikeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
      credentials: "include",
    });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); setMsgOk(false); setLoading(false); return; }
    setFreshKey({ key: d.key, name: d.name });
    setNewKeyName("");
    loadKeys();
    setLoading(false);
  }

  async function revokeKey(id) {
    if (!confirm("Revoke key ini? Client yang pake langsung kehilangan akses.")) return;
    await fetch(`/api/apikeys?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
    loadKeys();
  }

  return (
    <>
      <NAV accounts={accounts} active={active} />
      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px" }}>
        <h1>Settings</h1>

        <div className="card">
          <h1 style={{ fontSize:14, marginBottom:12 }}>Setup Checklist</h1>
          <ul style={{ fontSize:13, paddingLeft:4, lineHeight:2, margin:0 }}>
            <Check done={!!master}>MASTER_EMAIL diset di env</Check>
            <Check done={accounts.length > 0}>Minimal 1 akun Gmail terdaftar</Check>
            <Check done={connectedCount > 0}>Minimal 1 akun Gmail connected</Check>
          </ul>
        </div>

        <div className="card">
          <h1 style={{ fontSize:14, marginBottom:12 }}>Akun Gmail ({accounts.length})</h1>
          {accounts.length === 0 && <p style={{ color:"#555", fontSize:13 }}>Belum ada akun. Tambah di bawah.</p>}
          {accounts.map(a => (
            <div key={a.email} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #222", flexWrap:"wrap" }}>
              <span style={{ fontFamily:"monospace", fontSize:13, color: a.email === active ? "#4fc3f7" : "#ccc", flex:1, minWidth:200 }}>
                {a.email}
                {a.email === active && <span style={{ color:"#81c784", fontSize:10 }}> · aktif</span>}
                {a.label ? <span style={{ color:"#666", fontSize:11 }}> · {a.label}</span> : null}
              </span>
              <span style={{ fontSize:11, color: a.connected ? "#66bb6a" : "#ef5350" }}>{a.connected ? "Connected ✓" : "Belum connect"}</span>
              {!a.connected
                ? <button className="btn btn-primary" style={{ fontSize:11, padding:"4px 10px" }} onClick={()=>startOAuth(a.email)} disabled={loading}>Connect</button>
                : <button className="btn" style={{ fontSize:11, padding:"4px 10px", background:"transparent", border:"1px solid #444", color:"#aaa" }} onClick={()=>disconnect(a.email)} disabled={loading}>Putuskan</button>}
              {a.email !== active && a.connected && (
                <button className="btn" style={{ fontSize:11, padding:"4px 10px", background:"transparent", border:"1px solid #444", color:"#4fc3f7" }} onClick={()=>switchAccount(a.email)}>Aktifkan</button>
              )}
              <button className="btn btn-danger" style={{ fontSize:11, padding:"4px 8px" }} onClick={()=>removeAccount(a.email)}>del</button>
            </div>
          ))}

          <form onSubmit={addAccount} style={{ marginTop:14 }}>
            <div className="row">
              <input className="input" placeholder="email@gmail.com" value={newEmail} onChange={e=>setNewEmail(e.target.value)} style={{ flex:2, minWidth:200 }} required />
              <input className="input" placeholder="label opsional" value={newLabel} onChange={e=>setNewLabel(e.target.value)} style={{ flex:1, minWidth:120 }} />
              <button className="btn btn-primary" disabled={loading || !newEmail}>+ Daftarkan</button>
            </div>
          </form>
        </div>

        {authUrl && (
          <div className="card">
            <h1 style={{ fontSize:14, marginBottom:12 }}>OAuth — {flowEmail}</h1>
            <p style={{ fontSize:12, color:"#888", marginBottom:8 }}>Penting: login pakai akun <strong style={{ color:"#4fc3f7" }}>{flowEmail}</strong> di layar Google.</p>
            <a href={authUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak:"break-all", fontSize:12, color:"#4fc3f7" }}>{authUrl}</a>
            <div style={{ marginTop:12 }}>
              <label className="label">Paste redirect URL / code:</label>
              <input className="input" placeholder="https://alias.casa.web.id/api/gmail/callback?state=...&code=..." value={code} onChange={e=>setCode(e.target.value)} />
              <button className="btn btn-primary" style={{ marginTop:8 }} onClick={exchange} disabled={loading || !code}>Simpan Token</button>
            </div>
          </div>
        )}

        <div className="card">
          <h1 style={{ fontSize:14, marginBottom:8 }}>Redirect URI</h1>
          <input className="input" value={redirectUri} onChange={e=>setRedirectUri(e.target.value)} />
          <p style={{ fontSize:11, color:"#555", marginTop:4 }}>Harus terdaftar di Google Cloud Console (OAuth client).</p>
        </div>

        <div className="card">
          <h1 style={{ fontSize:14, marginBottom:12 }}>API Keys ({apiKeys.length})</h1>
          <p style={{ fontSize:12, color:"#888", marginBottom:10 }}>
            Buat automation/script. Pakai header: <code style={{ color:"#4fc3f7" }}>Authorization: Bearer ***</code> — opsional <code style={{ color:"#4fc3f7" }}>X-Account: email@gmail.com</code> buat pilih akun.
          </p>
          {apiKeys.length === 0 && <p style={{ color:"#555", fontSize:13 }}>Belum ada key.</p>}
          {apiKeys.map(k => (
            <div key={k.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #222", flexWrap:"wrap" }}>
              <span style={{ fontSize:13, color:"#ccc", flex:1, minWidth:150 }}>{k.name}</span>
              <span style={{ fontSize:11, color:"#666" }}>
                dibikin {new Date(k.created_at).toLocaleDateString("id")}
                {k.last_used_at ? ` · dipake ${new Date(k.last_used_at).toLocaleString("id")}` : " · belum pernah dipake"}
              </span>
              <button className="btn btn-danger" style={{ fontSize:11, padding:"4px 8px" }} onClick={()=>revokeKey(k.id)}>revoke</button>
            </div>
          ))}
          <form onSubmit={createKey} style={{ marginTop:12 }}>
            <div className="row">
              <input className="input" placeholder="nama key (misal: bot-telegram)" value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} style={{ flex:2, minWidth:180 }} />
              <button className="btn btn-primary" disabled={loading || !newKeyName.trim()}>+ Bikin Key</button>
            </div>
          </form>
          {freshKey && (
            <div style={{ marginTop:12, padding:12, background:"#1a2a1a", border:"1px solid #2a5a2a", borderRadius:4 }}>
              <p style={{ fontSize:12, color:"#81c784", marginBottom:6 }}>
                Key <strong>{freshKey.name}</strong> dibuat. <strong>Copy sekarang — ga bakal ditampilin lagi:</strong>
              </p>
              <div className="row">
                <input className="input" readOnly value={freshKey.key} style={{ flex:1, fontFamily:"monospace", fontSize:12 }} onFocus={e=>e.target.select()} />
                <button className="btn" style={{ fontSize:12, background:"transparent", border:"1px solid #444", color:"#4fc3f7" }}
                  onClick={()=>navigator.clipboard.writeText(freshKey.key).catch(()=>{})}>copy</button>
                <button className="btn" style={{ fontSize:12, background:"transparent", border:"1px solid #444", color:"#888" }}
                  onClick={()=>setFreshKey(null)}>tutup</button>
              </div>
            </div>
          )}
        </div>

        {msg && <p style={{ color: msgOk ? "#66bb6a" : "#ef5350", marginTop:8 }}>{msg}</p>}
      </div>
    </>
  );
}
