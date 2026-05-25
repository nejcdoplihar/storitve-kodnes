"use client";
// components/admin/LicencniKljuc.tsx
// Komponente za prikaz / urejanje licenčnega ključa
// — masking + show/hide toggle + copy-to-clipboard z vizualnim feedbackom

import { useState } from "react";
import { BRAND } from "@/lib/constants";
import { icons } from "./Icons";

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
