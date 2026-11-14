"use client";
import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error || "Gagal"); setLoading(false); return; }
    window.location.href = "/dashboard";
  }

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ width:340 }}>
        <h1 style={{ color:"#4fc3f7", marginBottom:24, fontSize:22 }}>Alias Dash</h1>
        <form onSubmit={handle}>
          <div style={{ marginBottom:12 }}>
            <label className="label">Password</label>
            <input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Enter password" autoFocus />
          </div>
          {err && <p className="err">{err}</p>}
          <button className="btn btn-primary" style={{ width:"100%", marginTop:8 }} disabled={loading}>
            {loading ? "..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
