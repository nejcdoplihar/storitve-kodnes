"use client";
// components/admin/views/OpravilaView.tsx
// Pogled za opravila: tabela z beleženjem časa, urno postavko in statusom plačila

import { useState, useMemo, useRef, useEffect } from "react";
import { useOpravila } from "@/hooks/useOpravila";
import { useStranke } from "@/hooks/useWPData";
import { useCurrentUser } from "@/hooks/useAuth";
import { fmtDate } from "@/lib/helpers";
import { BRAND } from "@/lib/constants";
import { icons } from "../Icons";
import type { Opravilo } from "@/types/admin";
import type { Post } from "@/types/admin";

const CAS_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5);

const thS: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#888",
  borderBottom: "1px solid #f0f0f0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

function getPlacano(o: Opravilo): boolean {
  const v = o.acf?.placano;
  if (typeof v === "boolean") return v;
  if (v === "1" || v === 1 || v === "true") return true;
  return false;
}

// ============================================================
// STRANKA SEARCH SELECT (za opravila)
// ============================================================
function StrankaSearchSelect({
  stranke,
  value,
  onChange,
}: {
  stranke: Post[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setOpen(true);
    setQuery("");
  };

  const selectedStranka = stranke.find((s) => String(s.id) === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...stranke].sort((a, b) =>
      a.title.rendered.localeCompare(b.title.rendered, "sl")
    );
    if (!q) return sorted;
    return sorted.filter((s) => {
      const title = s.title.rendered.toLowerCase();
      const domena = String((s.acf as Record<string, unknown>)?.domena_url || "").toLowerCase();
      return title.includes(q) || domena.includes(q);
    });
  }, [stranke, query]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={open ? query : selectedStranka?.title.rendered || ""}
        onFocus={openDropdown}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) openDropdown();
          if (value) onChange("");
        }}
        placeholder="Iskanje stranke..."
        style={inputStyle}
      />
      {open && (
        <div
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 99999,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "#888" }}>Ni rezultatov</div>
          ) : (
            filtered.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(String(s.id));
                  setQuery("");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: "none",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#111",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0fdfc";
                  e.currentTarget.style.color = BRAND;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.color = "#111";
                }}
              >
                {s.title.rendered}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SKUPNI FORM ZA DODAJ IN UREDI OPRAVILO
// ============================================================
type OpraviloForm = {
  datum_opravila: string;
  uporabnik: string;
  naslov_opravila: string;
  opis_opravila: string;
  cas_ure: string;
  custom_postavka: boolean;
  urna_postavka: string;
  stranka_id: string;
  placano: boolean;
};

function OpraviloFormBody({
  form,
  set,
  stranke,
  error,
}: {
  form: OpraviloForm;
  set: (k: string, v: unknown) => void;
  stranke: Post[];
  error: string;
}) {
  const znesek =
    parseFloat(form.cas_ure) *
    (form.custom_postavka ? parseFloat(form.urna_postavka) || 0 : 35);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stranka */}
      <div>
        <label style={labelStyle}>Stranka</label>
        <StrankaSearchSelect
          stranke={stranke}
          value={form.stranka_id}
          onChange={(v) => set("stranka_id", v)}
        />
      </div>
      {/* Datum + Uporabnik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Datum opravila</label>
          <input
            type="date"
            value={`${form.datum_opravila.slice(0, 4)}-${form.datum_opravila.slice(4, 6)}-${form.datum_opravila.slice(6, 8)}`}
            onChange={(e) => set("datum_opravila", e.target.value.replace(/-/g, ""))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Uporabnik</label>
          <select value={form.uporabnik} onChange={(e) => set("uporabnik", e.target.value)} style={inputStyle}>
            <option value="nejc">Nejc</option>
            <option value="klemen">Klemen</option>
          </select>
        </div>
      </div>
      {/* Naslov */}
      <div>
        <label style={labelStyle}>Naslov opravila <span style={{ color: "#ef4444" }}>*</span></label>
        <input
          value={form.naslov_opravila}
          onChange={(e) => set("naslov_opravila", e.target.value)}
          placeholder="npr. Popravek kontaktnega obrazca"
          style={inputStyle}
        />
      </div>
      {/* Opis */}
      <div>
        <label style={labelStyle}>Opis</label>
        <textarea
          value={form.opis_opravila}
          onChange={(e) => set("opis_opravila", e.target.value)}
          placeholder="Podrobnejši opis opravljenega dela..."
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
      {/* Čas + Postavka */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Porabljen čas</label>
          <select value={form.cas_ure} onChange={(e) => set("cas_ure", e.target.value)} style={inputStyle}>
            {CAS_OPTIONS.map((v) => (
              <option key={v} value={v}>{v} {v === 1 ? "ura" : v < 5 ? "ure" : "ur"}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Urna postavka</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              value={form.custom_postavka ? form.urna_postavka : "35"}
              disabled={!form.custom_postavka}
              onChange={(e) => set("urna_postavka", e.target.value)}
              style={{ ...inputStyle, background: form.custom_postavka ? "#fff" : "#f8f9fb" }}
            />
            <span style={{ fontSize: 13, color: "#666", whiteSpace: "nowrap" }}>€/h</span>
          </div>
        </div>
      </div>
      {/* Custom postavka checkbox */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onClick={() => set("custom_postavka", !form.custom_postavka)}
          style={{
            width: 18, height: 18, borderRadius: 4,
            border: `2px solid ${form.custom_postavka ? BRAND : "#d1d5db"}`,
            background: form.custom_postavka ? BRAND : "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {form.custom_postavka && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <label onClick={() => set("custom_postavka", !form.custom_postavka)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>
          Drugačna urna postavka
        </label>
      </div>
      {/* Znesek preview */}
      <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "#888" }}>Skupaj za to opravilo:</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
          {znesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
        </span>
      </div>
      {/* Plačano */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onClick={() => set("placano", !form.placano)}
          style={{
            width: 18, height: 18, borderRadius: 4,
            border: `2px solid ${form.placano ? "#16a34a" : "#d1d5db"}`,
            background: form.placano ? "#16a34a" : "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {form.placano && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <label onClick={() => set("placano", !form.placano)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>
          Že plačano
        </label>
      </div>
      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DODAJ OPRAVILO MODAL
// ============================================================
function DodajOpraviloModal({
  onClose,
  onSaved,
  stranke,
  username,
}: {
  onClose: () => void;
  onSaved: () => void;
  stranke: Post[];
  username: string;
}) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  const [form, setForm] = useState<OpraviloForm>({
    datum_opravila: todayStr,
    uporabnik: username || "",
    naslov_opravila: "",
    opis_opravila: "",
    cas_ure: "1",
    custom_postavka: false,
    urna_postavka: "35",
    stranka_id: "",
    placano: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (username && !form.uporabnik) {
      setForm((f) => ({ ...f, uporabnik: username }));
    }
  }, [username]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.naslov_opravila.trim()) { setError("Naslov opravila je obvezen"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/opravilo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          stranka_id: form.stranka_id ? parseInt(form.stranka_id) : null,
          cas_ure: parseFloat(form.cas_ure),
          urna_postavka: parseFloat(form.urna_postavka) || 35,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Dodaj opravilo" onClose={onClose} saving={saving} onSave={handleSave} saveLabel="Shrani opravilo">
      <OpraviloFormBody form={form} set={set} stranke={stranke} error={error} />
    </ModalShell>
  );
}

// ============================================================
// UREDI OPRAVILO MODAL
// ============================================================
function UrediOpraviloModal({
  opravilo,
  stranke,
  onClose,
  onSaved,
}: {
  opravilo: Opravilo;
  stranke: Post[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Pridobi stranka_id iz relacije
  const strankaRel = opravilo.acf?.stranka_rel;
  const initStrankaId = Array.isArray(strankaRel) && strankaRel[0]
    ? String(typeof strankaRel[0] === "object" ? (strankaRel[0] as { ID?: number; post_title?: string }).ID ?? 0 : strankaRel[0])
    : "";

  // Datum je v formatu d/m/Y — pretvorimo v Ymd za input
  const rawDatum = opravilo.acf?.datum_opravila || "";
  let initDatum = "";
  if (rawDatum.includes("/")) {
    const parts = rawDatum.split("/");
    if (parts.length === 3) initDatum = `${parts[2]}${parts[1].padStart(2, "0")}${parts[0].padStart(2, "0")}`;
  } else {
    initDatum = rawDatum;
  }

  const [form, setForm] = useState<OpraviloForm>({
    datum_opravila: initDatum,
    uporabnik: opravilo.acf?.uporabnik || "",
    naslov_opravila: opravilo.acf?.naslov_opravila || opravilo.title.rendered.replace(/<[^>]*>/g, ""),
    opis_opravila: opravilo.acf?.opis_opravila || "",
    cas_ure: String(opravilo.acf?.cas_ure || "1"),
    custom_postavka: opravilo.acf?.custom_postavka || false,
    urna_postavka: String(opravilo.acf?.urna_postavka || "35"),
    stranka_id: initStrankaId,
    placano: getPlacano(opravilo),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.naslov_opravila.trim()) { setError("Naslov opravila je obvezen"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/opravilo/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: opravilo.id,
          ...form,
          stranka_id: form.stranka_id ? parseInt(form.stranka_id) : null,
          cas_ure: parseFloat(form.cas_ure),
          urna_postavka: parseFloat(form.urna_postavka) || 35,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
      setSaving(false);
    }
  };

  const rawTitle = opravilo.acf?.naslov_opravila || opravilo.title.rendered.replace(/<[^>]*>/g, "");

  return (
    <ModalShell title="Uredi opravilo" subtitle={rawTitle} onClose={onClose} saving={saving} onSave={handleSave} saveLabel="Shrani spremembe">
      <OpraviloFormBody form={form} set={set} stranke={stranke} error={error} />
    </ModalShell>
  );
}

// ============================================================
// SKUPNI MODAL SHELL
// ============================================================
function ModalShell({
  title,
  subtitle,
  onClose,
  saving,
  onSave,
  saveLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  saving: boolean;
  onSave: () => void;
  saveLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(720px, 92vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 4 }}>
            {icons.close}
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555" }}>
            Prekliči
          </button>
          <button onClick={onSave} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: saving ? "#99d6d8" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Shranjujem..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// OPRAVILA TABELA
// ============================================================
export function OpravilaTabela({
  opravila,
  loading,
  error,
  onRefetch,
  onDodaj,
  showStranka = true,
  stranke = [],
}: {
  opravila: Opravilo[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onDodaj?: () => void;
  showStranka?: boolean;
  stranke?: Post[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [editTarget, setEditTarget] = useState<Opravilo | null>(null);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === opravila.length) setSelected(new Set());
    else setSelected(new Set(opravila.map((o) => o.id)));
  };

  const updatePlacano = async (ids: number[], placano: boolean) => {
    setUpdatingIds(new Set(ids));
    try {
      await fetch("/api/opravilo/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, placano }),
      });
      await onRefetch();
      setSelected(new Set());
    } finally {
      setUpdatingIds(new Set());
    }
  };

  const skupajZnesek = opravila.reduce((sum, o) => {
    const postavka = o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35;
    return sum + (o.acf?.cas_ure || 0) * postavka;
  }, 0);

  const neplačanoZnesek = opravila
    .filter((o) => !getPlacano(o))
    .reduce((sum, o) => {
      const postavka = o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35;
      return sum + (o.acf?.cas_ure || 0) * postavka;
    }, 0);

  return (
    <div>
      {editTarget && (
        <UrediOpraviloModal
          opravilo={editTarget}
          stranke={stranke}
          onClose={() => setEditTarget(null)}
          onSaved={onRefetch}
        />
      )}

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Skupaj opravil", value: opravila.length, color: "#111", border: "#f0f0f0" },
          { label: "Skupaj vrednost", value: `${skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €`, color: "#111", border: "#f0f0f0" },
          { label: "Neplačano", value: `${neplačanoZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €`, color: "#dc2626", border: "#fee2e2" },
        ].map(({ label, value, color, border }) => (
          <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", border: `1px solid ${border}`, flex: 1 }}>
            <div style={{ fontSize: 12, color, marginBottom: 4, opacity: color === "#dc2626" ? 1 : 0.6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111", flex: 1 }}>Opravila ({opravila.length})</span>
          {selected.size > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => updatePlacano(Array.from(selected), true)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#dcfce7", color: "#16a34a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ✓ Označi kot plačano ({selected.size})
              </button>
              <button onClick={() => updatePlacano(Array.from(selected), false)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ✗ Neplačano ({selected.size})
              </button>
            </div>
          )}
          <button onClick={onRefetch} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center" }} title="Osveži">
            {icons.refresh}
          </button>
          {onDodaj && (
            <button onClick={onDodaj} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              + Dodaj opravilo
            </button>
          )}
        </div>

        {error && <div style={{ padding: 20, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠️ Napaka: {error}</div>}
        {loading && <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje opravil...</div>}
        {!loading && !error && opravila.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Ni opravil</div>}

        {!loading && !error && opravila.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ padding: "10px 16px", width: 36 }}>
                    <div onClick={toggleAll} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected.size === opravila.length ? BRAND : "#d1d5db"}`, background: selected.size === opravila.length ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected.size === opravila.length && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </th>
                  {showStranka && <th style={thS}>Stranka</th>}
                  <th style={thS}>Datum</th>
                  <th style={thS}>Naslov</th>
                  <th style={thS}>Uporabnik</th>
                  <th style={thS}>Čas</th>
                  <th style={thS}>Znesek</th>
                  <th style={thS}>Status</th>
                  <th style={thS}></th>
                </tr>
              </thead>
              <tbody>
                {opravila.map((o, i) => {
                  const placano = getPlacano(o);
                  const postavka = o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35;
                  const znesek = (o.acf?.cas_ure || 0) * postavka;
                  const isSelected = selected.has(o.id);
                  const isUpdating = updatingIds.has(o.id);
                  return (
                    <tr
                      key={o.id}
                      style={{ borderBottom: i < opravila.length - 1 ? "1px solid #f7f7f7" : "none", background: isSelected ? "#f0fdf4" : "transparent", opacity: isUpdating ? 0.5 : 1 }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div onClick={() => toggleSelect(o.id)} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? BRAND : "#d1d5db"}`, background: isSelected ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                      </td>
                      {showStranka && (
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#555" }}>
                          {(Array.isArray(o.acf?.stranka_rel) && o.acf.stranka_rel[0]?.post_title) || "—"}
                        </td>
                      )}
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#666", whiteSpace: "nowrap" }}>
                        {fmtDate(o.acf?.datum_opravila)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{o.acf?.naslov_opravila || o.title.rendered}</div>
                        {o.acf?.opis_opravila && (
                          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                            {o.acf.opis_opravila.slice(0, 80)}{o.acf.opis_opravila.length > 80 ? "..." : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#666" }}>{o.acf?.uporabnik || "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#333", whiteSpace: "nowrap" }}>
                        {o.acf?.cas_ure} ur
                        {o.acf?.custom_postavka && <div style={{ fontSize: 11, color: "#aaa" }}>{postavka} €/h</div>}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: "#111", whiteSpace: "nowrap" }}>
                        {znesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => updatePlacano([o.id], !placano)}
                          disabled={isUpdating}
                          style={{ padding: "4px 10px", borderRadius: 16, border: "none", cursor: isUpdating ? "default" : "pointer", fontWeight: 600, fontSize: 11, background: placano ? "#dcfce7" : "#fee2e2", color: placano ? "#16a34a" : "#dc2626" }}
                        >
                          {placano ? "✓ Plačano" : "Neplačano"}
                        </button>
                      </td>
                      {/* Gumb Uredi */}
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => setEditTarget(o)}
                          style={{ fontSize: 12, color: BRAND, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0, whiteSpace: "nowrap" }}
                        >
                          Uredi {icons.arrow}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// OPRAVILA VIEW — MAIN EXPORT
// ============================================================
export function OpravilaView() {
  const { opravila, loading, error, refetch } = useOpravila();
  const { stranke } = useStranke();
  const username = useCurrentUser();
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      {showModal && (
        <DodajOpraviloModal
          onClose={() => setShowModal(false)}
          onSaved={refetch}
          stranke={stranke}
          username={username}
        />
      )}
      <OpravilaTabela
        opravila={opravila}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onDodaj={() => setShowModal(true)}
        showStranka={true}
        stranke={stranke}
      />
    </div>
  );
}
