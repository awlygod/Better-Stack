"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [jwt, setJwt] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [websites, setWebsites] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<any>(null);
  const [websiteDetails, setWebsiteDetails] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    const storedJwt = localStorage.getItem("jwt");
    if (storedJwt) setJwt(storedJwt);
    setMounted(true);
  }, []);

  const signup = async () => {
    try {
      setError("");
      const res = await fetch(`${API_URL}/user/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg =
          typeof data.error === "string"
            ? data.error
            : Array.isArray(data.error)
            ? data.error[0]?.message || "Signup failed"
            : "Signup failed";
        setError(errorMsg);
        return;
      }
      setError(" Signup successful. Now sign in.");
      setUsername("");
      setPassword("");
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    }
  };

  const signin = async () => {
    try {
      setError("");
      const res = await fetch(`${API_URL}/user/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invalid credentials");
        return;
      }
      setJwt(data.jwt);
      localStorage.setItem("jwt", data.jwt);
      setError(" Signed in!");
      setUsername("");
      setPassword("");
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    }
  };

  const fetchWebsites = async () => {
    try {
      setError("");
      const storedJwt = jwt || localStorage.getItem("jwt");
      if (!storedJwt) { setError("Not logged in"); return; }
      const res = await fetch(`${API_URL}/website/all`, {
        headers: { Authorization: storedJwt },
      });
      if (!res.ok) { setError("Failed to fetch websites"); return; }
      setWebsites(await res.json());
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    }
  };

  const addWebsite = async () => {
    try {
      setError("");
      const storedJwt = jwt || localStorage.getItem("jwt");
      if (!storedJwt) { setError("Not logged in"); return; }
      if (!newUrl) { setError("Enter a URL"); return; }
      const res = await fetch(`${API_URL}/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: storedJwt },
        body: JSON.stringify({ url: newUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to add website");
        return;
      }
      setNewUrl("");
      setError("Website added!");
      fetchWebsites();
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    }
  };

  const openWebsiteDetails = async (website: any) => {
    try {
      const storedJwt = jwt || localStorage.getItem("jwt");
      if (!storedJwt) return;
      const res = await fetch(`${API_URL}/status/${website.id}`, {
        headers: { Authorization: storedJwt },
      });
      if (!res.ok) { setError("Failed to fetch website details"); return; }
      setWebsiteDetails(await res.json());
      setSelectedWebsite(website);
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    }
  };

  const closeModal = () => { setSelectedWebsite(null); setWebsiteDetails(null); };
  const handleLogout = () => { localStorage.removeItem("jwt"); setJwt(""); setWebsites([]); setError(""); };

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#080808" }} />;

  const isLoggedIn = jwt || localStorage.getItem("jwt");
  const isSuccess = error.includes("-");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080808;
          color: #d4d4d4;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .app {
          min-height: 100vh;
          background: #080808;
          display: flex;
          flex-direction: column;
        }

        /* ── Topbar ── */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid #1e1e1e;
          background: #0d0d0d;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: #f0f0f0;
          letter-spacing: 0.03em;
        }
        .logo-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 10px #4ade8077;
          animation: blink 2.5s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }

        /* ── Auth: full-screen center ── */
        .auth-screen {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          min-height: calc(100vh - 57px);
        }

        /* ── Auth card ── */
        .auth-card {
          background: #111111;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          padding: 36px;
          width: 100%;
          max-width: 380px;
        }

        /* ── Dashboard ── */
        .main {
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          padding: 40px 24px;
          flex: 1;
        }

        .section-label {
          font-size: 10px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.12em;
          color: #444;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        /* ── Toast ── */
        .toast {
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          margin-bottom: 24px;
          border: 1px solid;
        }
        .toast.success { background: #0a1a10; color: #4ade80; border-color: #1a3320; }
        .toast.error   { background: #1a0c0c; color: #f87171; border-color: #3a1818; }

        /* ── Inputs ── */
        .input {
          width: 100%;
          padding: 11px 14px;
          background: #0a0a0a;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          color: #d4d4d4;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 10px;
        }
        .input:focus { border-color: #333; }
        .input::placeholder { color: #2c2c2c; }

        /* ── Buttons ── */
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover { opacity: 0.82; }
        .btn:active { transform: scale(0.97); }
        .btn-primary { background: #efefef; color: #0a0a0a; }
        .btn-ghost {
          background: #161616;
          color: #777;
          border: 1px solid #222;
        }
        .btn-ghost:hover { background: #1c1c1c; color: #aaa; }
        .btn-danger {
          background: #1a0d0d;
          color: #f87171;
          border: 1px solid #3a1818;
        }
        .btn-danger:hover { background: #200f0f; }
        .btn-green {
          background: #0d1a10;
          color: #4ade80;
          border: 1px solid #1a3320;
        }
        .btn-green:hover { background: #0f1f13; }
        .btn-row { display: flex; gap: 8px; margin-top: 16px; }
        .btn-row .btn { flex: 1; }

        /* ── Panel ── */
        .panel {
          background: #111111;
          border: 1px solid #1e1e1e;
          border-radius: 14px;
          padding: 28px;
          margin-bottom: 16px;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .panel-title {
          font-size: 10px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.12em;
          color: #444;
          text-transform: uppercase;
        }
        .count-badge {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #444;
          background: #1a1a1a;
          border: 1px solid #222;
          border-radius: 20px;
          padding: 2px 10px;
        }

        /* ── URL row ── */
        .url-row { display: flex; gap: 8px; align-items: center; }
        .url-row .input { margin-bottom: 0; flex: 1; }

        /* ── Site cards ── */
        .site-card {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 14px 18px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .site-card:last-child { margin-bottom: 0; }
        .site-card:hover { border-color: #2a2a2a; background: #111; }
        .site-url {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #999;
        }
        .site-meta { display: flex; align-items: center; gap: 12px; }
        .status-pill {
          font-size: 11px;
          font-family: 'DM Mono', monospace;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        .status-up   { background: #0d1a10; color: #4ade80; }
        .status-down { background: #1a0d0d; color: #f87171; }
        .status-wait { background: #1a1a1a; color: #444; }
        .resp-time {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #333;
        }
        .empty-state {
          text-align: center;
          padding: 32px 0;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #282828;
        }

        /* ── Modal ── */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #111111;
          border: 1px solid #1e1e1e;
          border-radius: 14px;
          padding: 32px;
          max-width: 640px;
          width: 92%;
          max-height: 82vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #1a1a1a;
        }
        .modal-url {
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: #aaa;
          margin-bottom: 8px;
        }
        .modal-status-row { display: flex; align-items: center; gap: 10px; }
        .close-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #555;
          font-size: 15px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 10px;
          line-height: 1;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .close-btn:hover { color: #888; background: #1e1e1e; }

        /* ── Tick list ── */
        .tick-item {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .tick-item:last-child { margin-bottom: 0; }
        .tick-status { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; }
        .tick-time { font-family: 'DM Mono', monospace; font-size: 11px; color: #333; margin-top: 4px; }
        .tick-ms { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #555; }
        .tick-region { font-family: 'DM Mono', monospace; font-size: 11px; color: #333; text-align: right; margin-top: 4px; }
      `}</style>

      <div className="app">
        {/* Sticky glassy topbar */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-dot" />
            BetterStack
          </div>
          {isLoggedIn && (
            <button className="btn btn-danger" onClick={handleLogout}>
              Sign out
            </button>
          )}
        </header>

        {/* Auth — perfectly centered */}
        {!isLoggedIn ? (
          <div className="auth-screen">
            <div className="auth-card">
              {error && (
                <div className={`toast ${isSuccess ? "success" : "error"}`} style={{ marginBottom: 20 }}>
                  {error}
                </div>
              )}
              <div className="section-label">Authentication</div>
              <input
                className="input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signin()}
              />
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={signup}>Sign up</button>
                <button className="btn btn-primary" onClick={signin}>Sign in</button>
              </div>
            </div>
          </div>
        ) : (
          <main className="main">
            {error && (
              <div className={`toast ${isSuccess ? "success" : "error"}`}>{error}</div>
            )}

            {/* Add website — glassy panel */}
            <div className="panel">
              <div className="section-label">Add website</div>
              <div className="url-row">
                <input
                  className="input"
                  type="text"
                  placeholder="https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWebsite()}
                />
                <button className="btn btn-green" onClick={addWebsite}>Add</button>
                <button className="btn btn-ghost" onClick={fetchWebsites}>Refresh</button>
              </div>
            </div>

            {/* Monitored websites — glassy panel */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Monitored websites</span>
                <span className="count-badge">{websites.length}</span>
              </div>

              {websites.length === 0 ? (
                <div className="empty-state">No websites yet — add one above</div>
              ) : (
                websites.map((site) => {
                  const tick = site.ticks?.[0];
                  const isUp = tick?.status === "Up";
                  return (
                    <div key={site.id} className="site-card" onClick={() => openWebsiteDetails(site)}>
                      <span className="site-url">{site.url}</span>
                      <div className="site-meta">
                        {tick ? (
                          <>
                            <span className="resp-time">{tick.response_time_ms}ms</span>
                            <span className={`status-pill ${isUp ? "status-up" : "status-down"}`}>
                              {tick.status}
                            </span>
                          </>
                        ) : (
                          <span className="status-pill status-wait">pending</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        )}
      </div>

      {/* Glassy modal */}
      {selectedWebsite && websiteDetails && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-url">{websiteDetails.url}</div>
                <div className="modal-status-row">
                  {websiteDetails.ticks?.[0] ? (
                    <>
                      <span className={`status-pill ${websiteDetails.ticks[0].status === "Up" ? "status-up" : "status-down"}`}>
                        {websiteDetails.ticks[0].status}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#444" }}>
                        {websiteDetails.ticks[0].response_time_ms}ms
                      </span>
                    </>
                  ) : (
                    <span className="status-pill status-wait">no data</span>
                  )}
                </div>
              </div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            <div className="section-label" style={{ marginBottom: 16 }}>Last 10 health checks</div>

            {websiteDetails.ticks?.length > 0 ? (
              websiteDetails.ticks.map((tick: any, idx: number) => (
                <div className="tick-item" key={idx}>
                  <div>
                    <div className="tick-status" style={{ color: tick.status === "Up" ? "#4ade80" : "#f87171" }}>
                      {tick.status}
                    </div>
                    <div className="tick-time">{new Date(tick.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="tick-ms">{tick.response_time_ms}ms</div>
                    <div className="tick-region">{tick.region}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No health checks yet</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}