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
        const href = toDirectUrl(d.url_datoteke);
        const name = fileNameFromUrl(d.url_datoteke);
        return (
          <a
            key={i}
            href={href}
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
