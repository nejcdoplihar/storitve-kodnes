"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BRAND = "#00a4a7";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: user, password: pass, rememberMe }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Napačno uporabniško ime ali geslo.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f9fb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Kodnes admin</div>
            <div style={{ fontSize: 12, color: "#888" }}>storitve.kodnes.com</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#555", display: "block", marginBottom: 6 }}>Uporabniško ime</label>
          <input
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="admin"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#555", display: "block", marginBottom: 6 }}>Geslo</label>
          <input
            value={pass}
            onChange={e => setPass(e.target.value)}
            type="password"
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Zapomni si me */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            onClick={() => setRememberMe(!rememberMe)}
            style={{
              width: 18, height: 18, borderRadius: 4, border: `2px solid ${rememberMe ? BRAND : "#d1d5db"}`,
              background: rememberMe ? BRAND : "#fff", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}
          >
            {rememberMe && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <label onClick={() => setRememberMe(!rememberMe)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>
            Zapomni si me <span style={{ color: "#aaa" }}>(30 dni)</span>
          </label>
        </div>

        {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "11px", borderRadius: 8, background: loading ? "#99d6d8" : BRAND, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer" }}
        >
          {loading ? "Prijavljam..." : "Prijava"}
        </button>
      </div>
    </div>
  );
}
