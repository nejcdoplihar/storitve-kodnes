"use client";
// components/admin/UserMenu.tsx
// Uporabniški meni v headerju in opozorilo o poteku seje

import { useState, useEffect, useRef } from "react";
import { BRAND, WP_ADMIN_URL } from "@/lib/constants";
import { icons } from "./Icons";

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "12px 14px",
  fontSize: 13,
  color: "#111",
  textDecoration: "none",
  cursor: "pointer",
  borderBottom: "1px solid #f3f4f6",
};

export function UserMenu() {
  const [user, setUser] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setUser(data.username || ""))
      .catch(() => setUser(""));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    user === "nejc" ? "Nejc Doplhar" : user === "klemen" ? "Klemen" : user || "Uporabnik";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 14,
          background: "#fff",
          border: 0,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: BRAND,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ textAlign: "left", lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{displayName}</div>
          <div style={{ fontSize: 11, color: "#888" }}>Prijavljen uporabnik</div>
        </div>
        <div style={{ color: "#888", display: "flex", alignItems: "center" }}>
          {icons.chevron_down}
        </div>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 220,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
            zIndex: 2000,
          }}
        >
          <a
            href="/admin?view=profil"
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Nastavitve profila
          </a>
          <a
            href={WP_ADMIN_URL}
            target="_blank"
            rel="noreferrer"
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            WP admin
          </a>
          <button
            onClick={handleLogout}
            style={{
              ...menuItemStyle,
              width: "100%",
              textAlign: "left",
              background: "#fff",
              border: "none",
              borderBottom: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Odjava
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SESSION WARNING
// ============================================================
export function SessionWarning({
  countdown,
  onStay,
  onLogout,
}: {
  countdown: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  const urgent = countdown <= 10;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "36px 40px",
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            margin: "0 auto 20px",
            background: urgent ? "#fee2e2" : "#f0fdf4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          ⏱️
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
          Seja bo kmalu potekla
        </h2>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px", lineHeight: 1.5 }}>
          Zaradi neaktivnosti boš avtomatsko odjavljen.
        </p>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            margin: "0 auto 24px",
            background: urgent ? "#fee2e2" : "#f0fdf4",
            border: `4px solid ${urgent ? "#dc2626" : BRAND}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s",
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: urgent ? "#dc2626" : BRAND }}>
            {countdown}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#6b7280",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Odjava
          </button>
          <button
            onClick={onStay}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: BRAND,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ostani prijavljen
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR USER + PROFILE BUTTON
// ============================================================
export function SidebarUser() {
  const [user, setUser] = useState("");
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUser(d.username || ""));
  }, []);

  const display =
    user === "nejc" ? "Nejc Doplhar" : user === "klemen" ? "Klemen" : user || "Uporabnik";
  const initials = display
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        padding: "16px 18px",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: BRAND,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{display}</div>
        <div style={{ color: "#64748b", fontSize: 11 }}>prijavljen uporabnik</div>
      </div>
    </div>
  );
}

export function SidebarProfileButton({
  sidebarOpen,
  active,
  onClick,
}: {
  sidebarOpen: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const [user, setUser] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.profile?.fullName || d.username || "");
        setAvatarUrl(d.profile?.avatarUrl || "");
      });
  }, []);

  const initials = user
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      title={!sidebarOpen ? "Profil" : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px",
        borderRadius: 8,
        border: active ? `1.5px solid ${BRAND}` : "1.5px solid transparent",
        cursor: "pointer",
        background: active ? `${BRAND}18` : "transparent",
        color: active ? BRAND : "#94a3b8",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        textAlign: "left",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#1e293b";
          e.currentTarget.style.color = "#fff";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#94a3b8";
        }
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: BRAND,
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={user} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </div>
      {sidebarOpen && <span style={{ fontSize: 13 }}>Profil</span>}
    </button>
  );
}
