"use client";
import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3002";

type Website = { id: string; url: string; user_id: string };
type Status = "Up" | "Down" | "Unknown" | "Pending";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = localStorage.getItem("jwt");
    const u = localStorage.getItem("userId");
    if (t) { setToken(t); setUserId(u); }
  }, []);

  const fetchStatus = useCallback(async (site: Website, jwt: string) => {
    try {
      const res = await fetch(`${API}/status/${site.id}`, {
        headers: { Authorization: jwt },
      });
      setStatuses(s => ({ ...s, [site.id]: res.ok ? "Unknown" : "Down" }));
    } catch {
      setStatuses(s => ({ ...s, [site.id]: "Down" }));
    }
  }, []);

  const loadWebsites = useCallback((jwt: string) => {
    const stored = localStorage.getItem("websites");
    const list: Website[] = stored ? JSON.parse(stored) : [];
    setWebsites(list);
    list.forEach(site => fetchStatus(site, jwt));
  }, [fetchStatus]);

  useEffect(() => {
    if (token) loadWebsites(token);
  }, [token, loadWebsites]);

  async function handleAuth() {
    setError(""); setLoading(true);
    try {
      if (tab === "signup") {
        const r = await fetch(`${API}/user/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!r.ok) { setError("Signup failed — username may already exist."); setLoading(false); return; }
        const d = await r.json();
        localStorage.setItem("userId", d.id);
        setUserId(d.id);
      }
      const r = await fetch(`${API}/user/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) { setError("Invalid username or password."); setLoading(false); return; }
      const d = await r.json();
      setToken(d.jwt);
      localStorage.setItem("jwt", d.jwt);
    } catch {
      setError("Network error. Is the API server running on port 3002?");
    }
    setLoading(false);
  }

  async function addWebsite() {
    if (!newUrl || !token) return;
    setAddError("");
    try {
      const r = await fetch(`${API}/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ url: newUrl }),
      });
      if (!r.ok) { setAddError("Failed to add website. Check the URL format."); return; }
      const d = await r.json();
      const site: Website = { id: d.id, url: newUrl, user_id: userId! };
      const updated = [...websites, site];
      setWebsites(updated);
      localStorage.setItem("websites", JSON.stringify(updated));
      setStatuses(s => ({ ...s, [d.id]: "Pending" }));
      setNewUrl("");
      fetchStatus(site, token);
    } catch {
      setAddError("Network error.");
    }
  }

  async function refreshSite(site: Website) {
    if (!token) return;
    setRefreshing(r => ({ ...r, [site.id]: true }));
    await fetchStatus(site, token);
    setRefreshing(r => ({ ...r, [site.id]: false }));
  }

  function removeSite(id: string) {
    const updated = websites.filter(w => w.id !== id);
    setWebsites(updated);
    localStorage.setItem("websites", JSON.stringify(updated));
    setStatuses(s => { const n = { ...s }; delete n[id]; return n; });
  }

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("userId");
    localStorage.removeItem("websites");
    setToken(null); setWebsites([]); setStatuses({});
  }

  if (!token) return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">🟢 BetterUptime</div>
        <p className="brand-sub">Website monitoring dashboard</p>
        <div className="tabs">
          <button className={tab === "signin" ? "tab active" : "tab"} onClick={() => { setTab("signin"); setError(""); }}>Sign In</button>
          <button className={tab === "signup" ? "tab active" : "tab"} onClick={() => { setTab("signup"); setError(""); }}>Sign Up</button>
        </div>
        <div className="form">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" onKeyDown={e => e.key === "Enter" && handleAuth()} />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleAuth()} />
          {error && <p className="err">{error}</p>}
          <button className="btn-primary" onClick={handleAuth} disabled={loading}>
            {loading ? "Please wait…" : tab === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dash">
      <header className="dash-header">
        <span className="brand">🟢 BetterUptime</span>
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </header>

      <main className="dash-main">
        <section className="add-section">
          <h2>Monitor a new website</h2>
          <div className="add-row">
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com" onKeyDown={e => e.key === "Enter" && addWebsite()} />
            <button className="btn-primary" onClick={addWebsite}>Add</button>
          </div>
          {addError && <p className="err">{addError}</p>}
        </section>

        <section className="list-section">
          <h2>Monitored Websites <span className="count">{websites.length}</span></h2>
          {websites.length === 0 && (
            <div className="empty">No websites monitored yet. Add one above ↑</div>
          )}
          <ul className="site-list">
            {websites.map(site => {
              const st = statuses[site.id] ?? "Pending";
              return (
                <li key={site.id} className="site-item">
                  <div className="site-left">
                    <span className={`dot dot-${st.toLowerCase()}`} />
                    <div>
                      <div className="site-url">{site.url}</div>
                      <div className="site-id">ID: {site.id}</div>
                    </div>
                  </div>
                  <div className="site-right">
                    <span className={`badge badge-${st.toLowerCase()}`}>{st}</span>
                    <button className="btn-icon" onClick={() => refreshSite(site)} disabled={refreshing[site.id]} title="Refresh">↻</button>
                    <button className="btn-icon btn-danger" onClick={() => removeSite(site.id)} title="Remove">✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="info-section">
          <h2>System Status</h2>
          <div className="info-grid">
            <div className="info-card"><div className="info-label">API Server</div><div className="info-val">● Online — localhost:3002</div></div>
            <div className="info-card"><div className="info-label">Database</div><div className="info-val">● Neon PostgreSQL</div></div>
            <div className="info-card"><div className="info-label">Redis Stream</div><div className="info-val">● Upstash Redis</div></div>
            <div className="info-card"><div className="info-label">Pusher</div><div className="info-val">● Running (3 min interval)</div></div>
          </div>
          <p className="note">💡 The worker pings all websites every 3 minutes via Redis stream and records Up/Down ticks in the database.</p>
        </section>
      </main>
    </div>
  );
}
