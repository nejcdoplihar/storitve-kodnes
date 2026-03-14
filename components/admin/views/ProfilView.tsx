"use client";
// components/admin/views/ProfilView.tsx
// Profil in nastavitve prijavljenega uporabnika

import { useState, useEffect } from "react";
import { BRAND } from "@/lib/constants";

const profileInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  marginTop: 6,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: BRAND,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111",
  fontWeight: 600,
  cursor: "pointer",
};

export function ProfilView() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    position: "",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Napaka");
        setUsername(data.username);
        setProfile(data.profile);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const initials = (profile.fullName || username || "U")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Profil uspešno shranjen.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Napaka");
    }
    setSaving(false);
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword !== repeatPassword) {
      setPasswordError("Gesli se ne ujemata.");
      return;
    }
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPasswordMessage("Geslo uspešno spremenjeno.");
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : "Napaka");
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Nalaganje profila...</div>;
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* LEVI PROFIL */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            padding: 24,
            textAlign: "center",
          }}
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || username}
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
                margin: "0 auto 16px",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: BRAND,
                color: "#fff",
                fontSize: 32,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 18, color: "#111" }}>
            {profile.fullName || username}
          </div>
          {profile.position && (
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{profile.position}</div>
          )}
          {profile.email && (
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>{profile.email}</div>
          )}
          <div
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 8,
              background: "#f8fafc",
              fontSize: 12,
              color: "#888",
            }}
          >
            Prijavljen kot: <strong style={{ color: "#111" }}>{username}</strong>
          </div>
        </div>

        {/* DESNI DEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* OSNOVNI PODATKI */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f0f0f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 20, margin: "0 0 20px" }}>Osnovni podatki</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Ime in priimek
                </label>
                <input
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  style={profileInputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Email</label>
                <input
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  style={profileInputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Pozicija</label>
                <input
                  value={profile.position}
                  onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                  style={profileInputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Prikazna slika (URL)
                </label>
                <input
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                  style={profileInputStyle}
                />
              </div>
            </div>
            {message && (
              <p style={{ color: "#16a34a", marginTop: 10, fontSize: 13 }}>{message}</p>
            )}
            {error && (
              <p style={{ color: "#dc2626", marginTop: 10, fontSize: 13 }}>{error}</p>
            )}
            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button onClick={saveProfile} style={primaryButton}>
                {saving ? "Shranjujem..." : "Shrani podatke"}
              </button>
            </div>
          </div>

          {/* SPREMEMBA GESLA */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f0f0f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 18, margin: "0 0 20px" }}>Sprememba gesla</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Trenutno geslo
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={profileInputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Novo geslo
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={profileInputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Ponovi novo geslo
                </label>
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  style={profileInputStyle}
                />
              </div>
            </div>
            {passwordMessage && (
              <p style={{ color: "#16a34a", marginTop: 10, fontSize: 13 }}>{passwordMessage}</p>
            )}
            {passwordError && (
              <p style={{ color: "#dc2626", marginTop: 10, fontSize: 13 }}>{passwordError}</p>
            )}
            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button onClick={changePassword} style={secondaryButton}>
                Spremeni geslo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
