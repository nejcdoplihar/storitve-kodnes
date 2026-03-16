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
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#f8f9fb",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: "16px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20,
        padding: "clamp(28px, 6vw, 44px) clamp(20px, 6vw, 40px)",
        width: "100%", maxWidth: 400,
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: BRAND,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#111", letterSpacing: "-0.3px" }}>Kodnes admin</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>storitve.kodnes.com</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Uporabniško ime</label>
          <input
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="admin"
            autoCapitalize="none"
            autoCorrect="off"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
            onFocus={e => e.target.style.borderColor = BRAND}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>Geslo</label>
          <input
            value={pass}
            onChange={e => setPass(e.target.value)}
            type="password"
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
            onFocus={e => e.target.style.borderColor = BRAND}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        {/* Zapomni si me */}
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 9 }}>
          <div
            onClick={() => setRememberMe(!rememberMe)}
            style={{
              width: 20, height: 20, borderRadius: 5,
              border: `2px solid ${rememberMe ? BRAND : "#d1d5db"}`,
              background: rememberMe ? BRAND : "#fff",
              cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {rememberMe && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <label onClick={() => setRememberMe(!rememberMe)} style={{ fontSize: 14, color: "#555", cursor: "pointer", userSelect: "none" }}>
            Zapomni si me <span style={{ color: "#bbb" }}>(30 dni)</span>
          </label>
        </div>

        {error && (
          <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "13px",
            borderRadius: 10, background: loading ? "#99d6d8" : BRAND,
            color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            letterSpacing: "0.2px",
          }}
        >
          {loading ? "Prijavljam..." : "Prijava"}
        </button>
      </div>
    </div>
  );
}
