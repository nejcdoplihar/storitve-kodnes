"use client";
// components/admin/UI.tsx
// Skupne UI komponente: gumbi, modali, form polja, badge-i

import { type ReactNode } from "react";
import { BRAND } from "@/lib/constants";
import { icons } from "./Icons";

// ============================================================
// GUMBI
// ============================================================
export function BtnPrimary({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 20px",
        borderRadius: 8,
        border: "none",
        background: disabled ? "#a0e0e1" : BRAND,
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 20px",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#fff",
        color: "#374151",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ============================================================
// MODAL WRAPPER
// ============================================================
export function ModalWrapper({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              padding: 4,
              borderRadius: 6,
            }}
          >
            {icons.close}
          </button>
        </div>
        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FORM FIELD
// ============================================================
export function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export const fldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 14,
  color: "#111",
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

// ============================================================
// ERROR MESSAGE
// ============================================================
export function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: "#fef2f2",
        color: "#dc2626",
        fontSize: 13,
        border: "1px solid #fecaca",
      }}
    >
      {msg}
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================
export function StatusBadge({ status }: { status: string }) {
  const isPublished = status === "publish";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        background: isPublished ? "#dcfce7" : "#fef9c3",
        color: isPublished ? "#15803d" : "#854d0e",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isPublished ? "#22c55e" : "#eab308",
        }}
      />
      {isPublished ? "Objavljeno" : "Osnutek"}
    </span>
  );
}

// ============================================================
// STAT CARD
// ============================================================
export function StatCard({
  label,
  value,
  loading,
  color,
  icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  color: string;
  icon: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "22px 24px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "#888", fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111", lineHeight: 1 }}>
            {loading ? (
              <span
                style={{
                  display: "inline-block",
                  width: 40,
                  height: 32,
                  background: "#f0f0f0",
                  borderRadius: 6,
                }}
              />
            ) : (
              value
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#22c55e",
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {icons.trend_up} iz WordPressa
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONFIRM DELETE DIALOG
// ============================================================
export function ConfirmDeleteDialog({
  naziv,
  onConfirm,
  onCancel,
  deleting,
}: {
  naziv: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "24px 24px 16px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 8 }}>
            Premakni v koš?
          </div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
            <strong style={{ color: "#111" }}>{naziv}</strong> bo premaknjen v WordPress koš. Obnovitev je
            možna iz WP admina.
          </div>
        </div>
        <div
          style={{
            padding: "12px 24px 20px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontSize: 14,
              cursor: "pointer",
              color: "#555",
            }}
          >
            Prekliči
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: deleting ? "#fca5a5" : "#dc2626",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: deleting ? "default" : "pointer",
            }}
          >
            {deleting ? "Brišem..." : "Premakni v koš"}
          </button>
        </div>
      </div>
    </div>
  );
}
