"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const BRAND = "#00a4a7";

// ============================================================
// FLOATING LABEL INPUT
// ============================================================
function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  autoCapitalize,
  autoCorrect,
  onKeyDown,
  rightSlot,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoCapitalize?: string;
  autoCorrect?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  rightSlot?: React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [focused, setFocused] = useState(false);
  const isFloated = focused || value.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={{
          width: "100%",
          padding: rightSlot ? "20px 44px 8px 14px" : "20px 14px 8px",
          borderRadius: 10,
          border: `1.5px solid ${focused ? BRAND : "#e5e7eb"}`,
          fontSize: 15,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          background: "#fff",
          boxShadow: focused ? `0 0 0 4px ${BRAND}1a` : "none",
          color: "#111",
        }}
      />
      <label
        style={{
          position: "absolute",
          left: 14,
          top: isFloated ? 6 : "50%",
          transform: isFloated ? "translateY(0)" : "translateY(-50%)",
          fontSize: isFloated ? 11 : 15,
          fontWeight: isFloated ? 600 : 400,
          color: focused ? BRAND : isFloated ? "#6b7280" : "#9ca3af",
          pointerEvents: "none",
          transition: "all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)",
          letterSpacing: isFloated ? "0.2px" : 0,
          textTransform: isFloated ? "uppercase" : "none",
        }}
      >
        {label}
      </label>
      {rightSlot && (
        <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOGIN PAGE
// ============================================================
export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const passRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Detekcija Caps Lock — globalno (ker mora delati tudi pri keydown na poljih)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isOn = e.getModifierState && e.getModifierState("CapsLock");
      setCapsLock(isOn);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

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
      setShakeKey((k) => k + 1); // sproži shake animacijo
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f8f9fb",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "16px",
      }}
    >
      <div
        ref={cardRef}
        key={shakeKey}
        className={shakeKey > 0 ? "ka-shake" : undefined}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "clamp(28px, 6vw, 44px) clamp(20px, 6vw, 40px)",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0",
        }}
      >
        {/* Logo */}
        <div
          className="ka-fade-up"
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, animationDelay: "0ms" }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 4px 14px ${BRAND}55`,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#111", letterSpacing: "-0.3px" }}>
              Kodnes admin
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>storitve.kodnes.com</div>
          </div>
        </div>

        {/* Uporabniško ime */}
        <div className="ka-fade-up" style={{ marginBottom: 14, animationDelay: "70ms" }}>
          <FloatingInput
            label="Uporabniško ime"
            value={user}
            onChange={setUser}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {/* Geslo */}
        <div className="ka-fade-up" style={{ marginBottom: 8, animationDelay: "140ms" }}>
          <FloatingInput
            label="Geslo"
            value={pass}
            onChange={setPass}
            type={showPass ? "text" : "password"}
            inputRef={passRef}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            rightSlot={
              <button
                type="button"
                onClick={() => {
                  setShowPass((s) => !s);
                  // Vrne focus nazaj na polje gesla
                  setTimeout(() => passRef.current?.focus(), 0);
                }}
                aria-label={showPass ? "Skrij geslo" : "Pokaži geslo"}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />
        </div>

        {/* Caps Lock indikator */}
        <div
          style={{
            height: capsLock ? 28 : 0,
            overflow: "hidden",
            transition: "height 0.18s ease",
            marginBottom: capsLock ? 10 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              background: "#fef3c7",
              color: "#854d0e",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid #fde68a",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L4 12h5v8h6v-8h5L12 2z" />
            </svg>
            Caps Lock je vključen
          </div>
        </div>

        {/* Zapomni si me */}
        <div
          className="ka-fade-up"
          style={{ marginBottom: 18, marginTop: 10, display: "flex", alignItems: "center", gap: 9, animationDelay: "210ms" }}
        >
          <div
            onClick={() => setRememberMe(!rememberMe)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `2px solid ${rememberMe ? BRAND : "#d1d5db"}`,
              background: rememberMe ? BRAND : "#fff",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {rememberMe && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <label
            onClick={() => setRememberMe(!rememberMe)}
            style={{ fontSize: 14, color: "#555", cursor: "pointer", userSelect: "none" }}
          >
            Zapomni si me <span style={{ color: "#bbb" }}>(30 dni)</span>
          </label>
        </div>

        {/* Napaka */}
        {error && (
          <div
            key={`err-${shakeKey}`}
            style={{
              color: "#dc2626",
              fontSize: 13,
              marginBottom: 16,
              padding: "10px 14px",
              background: "#fef2f2",
              borderRadius: 8,
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Gumb prijava */}
        <button
          className="ka-fade-up"
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 10,
            background: loading ? "#99d6d8" : BRAND,
            color: "#fff",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            letterSpacing: "0.2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.15s ease, transform 0.08s ease",
            animationDelay: "280ms",
          }}
          onMouseDown={(e) => {
            if (!loading) e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="ka-spin"
                style={{ flexShrink: 0 }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Prijavljam...
            </>
          ) : (
            "Prijava"
          )}
        </button>
      </div>
    </div>
  );
}
