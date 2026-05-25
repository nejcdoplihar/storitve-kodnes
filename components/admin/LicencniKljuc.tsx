"use client";
// components/admin/LicencniKljuc.tsx
// Komponente za prikaz / urejanje licenčnega ključa in datotek

import { useState } from "react";
import { BRAND } from "@/lib/constants";
import { icons } from "./Icons";

// ============================================================
// HELPERS
// ============================================================
function toDirectUrl(url: string): string {
  if (!url) return url;
  // Dropbox: dl=0 → dl=1 za direkten prenos
  return url.replace(/([?&])dl=0/, "$1dl=1");
}

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop() || url;
    return decodeURIComponent(name);
  } catch {
    return url;
  }
}

// ============================================================
// DATOTEKE DISPLAY — read-only (za tabelo / kartico)
// ============================================================
export function DatotekeDisplay({ datoteke }: { datoteke: Array<{ url_datoteke: string }> }) {
  const valid = (datoteke || []).filter((d) => d.url_datoteke?.trim());
  if (!valid.length) return <span style={{ color: "#bbb", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {valid.map((d, i) => {
        const name = fileNameFromUrl(d.url_datoteke);
        return (
          <a
            key={i}
            href={d.url_datoteke}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              background: "#f0fdf4",
              color: "#15803d",
              border: "1px solid #bbf7d0",
              textDecoration: "none",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span style={{ flexShrink: 0 }}>{icons.download}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
          </a>
        );
      })}
    </div>
  );
}

// ============================================================
// DATOTEKE REPEATER INPUT — za forme (nova / uredi licenca)
// ============================================================
export function DatotekeRepeaterInput({
  value,
  onChange,
}: {
  value: Array<{ url_datoteke: string }>;
  onChange: (v: Array<{ url_datoteke: string }>) => void;
}) {
  const add = () => onChange([...value, { url_datoteke: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, url: string) =>
    onChange(value.map((v, idx) => (idx === i ? { url_datoteke: url } : v)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {value.map((d, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="url"
            value={d.url_datoteke}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://www.dropbox.com/s/xxx/plugin.zip?dl=0"
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
              outline: "none",
              color: "#111",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            title="Odstrani"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#d1d5db", padding: 6, borderRadius: 6, display: "flex", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
          >
            {icons.trash}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          alignSelf: "flex-start",
          padding: "7px 14px",
          borderRadius: 8,
          border: "1px dashed #d1d5db",
          background: "#fafafa",
          color: "#6b7280",
          fontSize: 13,
          cursor: "pointer",
          fontWeight: 500,
          fontFamily: "inherit",
        }}
      >
        + Dodaj datoteko
      </button>
    </div>
  );
}

// ============================================================
// POGLEJ LICENCO MODAL — read-only popup
// ============================================================
export function PoglejLicencoModal({
  title,
  licencniKljuc,
  datoteke,
  onClose,
}: {
  title: string;
  licencniKljuc: string;
  datoteke: Array<{ url_datoteke: string }>;
  onClose: () => void;
}) {
  const validFiles = (datoteke || []).filter((d) => d.url_datoteke?.trim());

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "min(480px, 92vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</h2>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Podrobnosti licence</div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Licenčni ključ */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Licenčni ključ</div>
            {licencniKljuc
              ? <LicencniKljucDisplay value={licencniKljuc} />
              : <span style={{ color: "#bbb", fontSize: 13 }}>—</span>
            }
          </div>

          {/* Datoteke */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Datoteke {validFiles.length > 0 && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({validFiles.length})</span>}
            </div>
            {validFiles.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {validFiles.map((d, i) => (
                  <a
                    key={i}
                    href={d.url_datoteke}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      textDecoration: "none",
                      background: "#fafafa",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}
                  >
                    <span style={{ color: "#15803d", flexShrink: 0 }}>{icons.download}</span>
                    <span style={{ fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {fileNameFromUrl(d.url_datoteke)}
                    </span>
                    <span style={{ color: "#d1d5db", flexShrink: 0 }}>{icons.link}</span>
                  </a>
                ))}
              </div>
            ) : (
              <span style={{ color: "#bbb", fontSize: 13 }}>—</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 22px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555", fontWeight: 500 }}
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LICENCNI KLJUC DISPLAY — read-only cell (za tabelo / kartico)
// ============================================================
export function LicencniKljucDisplay({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback — izberi besedilo (legacy)
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible((v) => !v);
  };

  if (!value) {
    return <span style={{ color: "#bbb", fontSize: 12 }}>—</span>;
  }

  const masked = "•".repeat(Math.min(value.length, 16));

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: compact ? 12 : 13,
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "4px 8px",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          color: "#111",
          minWidth: 80,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={visible ? value : "••••"}
      >
        {visible ? value : masked}
      </span>
      <button
        type="button"
        onClick={handleToggle}
        title={visible ? "Skrij" : "Prikaži"}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#9ca3af",
          padding: 2,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = BRAND)}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
      >
        {visible ? icons.eye_off : icons.eye}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Kopirano!" : "Kopiraj"}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: copied ? "#16a34a" : "#9ca3af",
          padding: 2,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 4,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!copied) e.currentTarget.style.color = BRAND;
        }}
        onMouseLeave={(e) => {
          if (!copied) e.currentTarget.style.color = "#9ca3af";
        }}
      >
        {copied ? icons.check : icons.copy}
      </button>
    </div>
  );
}

// ============================================================
// LICENCNI KLJUC INPUT — z masking + toggle + copy v formi
// ============================================================
export function LicencniKljucInput({
  value,
  onChange,
  placeholder = "npr. XXXX-XXXX-XXXX-XXXX",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="new-password"
        spellCheck={false}
        style={{
          width: "100%",
          padding: "9px 76px 9px 12px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 14,
          color: "#111",
          outline: "none",
          background: "#fff",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: visible ? "normal" : "2px",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Skrij" : "Prikaži"}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#9ca3af",
            padding: 6,
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = BRAND)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
        >
          {visible ? icons.eye_off : icons.eye}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          title={copied ? "Kopirano!" : "Kopiraj"}
          style={{
            border: "none",
            background: "transparent",
            cursor: value ? "pointer" : "not-allowed",
            color: copied ? "#16a34a" : value ? "#9ca3af" : "#d1d5db",
            padding: 6,
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 6,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (value && !copied) e.currentTarget.style.color = BRAND;
          }}
          onMouseLeave={(e) => {
            if (value && !copied) e.currentTarget.style.color = "#9ca3af";
          }}
        >
          {copied ? icons.check : icons.copy}
        </button>
      </div>
    </div>
  );
}
