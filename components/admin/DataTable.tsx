"use client";
// components/admin/DataTable.tsx
// Generična tabela za prikaz CPT postov z iskanjem in paginacijo
// Mobilno prilagojena verzija — kartice namesto tabel na mobilnih napravah

import { useState, useMemo, useEffect } from "react";
import { useWPData, useAllWPData } from "@/hooks/useWPData";
import { formatDate, getAcfPreview, formatACFDate, getStoritveLabel } from "@/lib/helpers";
import { BRAND } from "@/lib/constants";
import { icons } from "./Icons";
import { StatusBadge, ConfirmDeleteDialog } from "./UI";

const DELETABLE = ["narocnik", "stranka", "ponudba"];
const EDITABLE = ["narocnik", "stranka"];

// ============================================================
// KONFIGURACIJSKI SISTEM STOLPCEV
// ============================================================
type ColValue = string | number | boolean | string[] | null | undefined;

type ColDef = {
  label: string;
  key?: string;                          // ACF ključ
  render?: (acf: Record<string, ColValue>, post: AnyPost) => React.ReactNode;
  width?: number;
  hideOnMobile?: boolean;
};

// Status badge za stanje_storitve (true/false → Aktivno/Neaktivno)
function StanjeBadge({ value }: { value: ColValue }) {
  const active = value === true || value === "true" || value === 1;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: active ? "#dcfce7" : "#f3f4f6",
      color: active ? "#15803d" : "#6b7280",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#22c55e" : "#9ca3af" }} />
      {active ? "Aktivno" : "Neaktivno"}
    </span>
  );
}

// Tip storitve kot pill-i
function StoritvePills({ value }: { value: ColValue }) {
  const STORITVE_LABELS: Record<string, string> = {
    domena: "Domena", gostovanje: "Gostovanje",
    dom_gos: "Dom. & gost.", vzdrzevanje: "Vzdrž.",
  };
  const items = Array.isArray(value) ? value : (value ? [String(value)] : []);
  if (!items.length) return <span style={{ color: "#bbb", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {items.map((s) => (
        <span key={s} style={{
          padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500,
          background: `${BRAND}15`, color: BRAND,
        }}>
          {STORITVE_LABELS[s] || s}
        </span>
      ))}
    </div>
  );
}

// Konfiguracija po CPT-jih
const CPT_COLUMNS: Record<string, ColDef[]> = {
  stranka: [
    {
      label: "Stanje",
      render: (acf) => <StanjeBadge value={acf.stanje_storitve} />,
      width: 110,
    },
    {
      label: "Tip storitve",
      render: (acf) => <StoritvePills value={acf.storitve} />,
      width: 180,
    },
  ],
  narocnik: [
    { label: "Kontakt", key: "narocnik_kontaktna_oseba", width: 160 },
    { label: "Naslov", key: "narocnik_naslov", width: 180, hideOnMobile: true },
  ],
  ponudba: [
    { label: "Znesek", render: (acf) => acf.znesek ? `${acf.znesek} €` : "—", width: 100 },
    {
      label: "Status", render: (acf) => {
        const labels: Record<string, string> = { v_obdelavi: "V obdelavi", poslana: "Poslana", sprejeta: "Sprejeta", zavrnjena: "Zavrnjena" };
        const s = String(acf.status_ponudbe || "");
        return <span style={{ fontSize: 12, color: "#555" }}>{labels[s] || s || "—"}</span>;
      }, width: 110,
    },
  ],
};

// Podrobnosti pod naslovom po CPT-jih
const CPT_SUBTITLE: Record<string, (acf: Record<string, ColValue>) => React.ReactNode> = {
  stranka: (acf) => {
    const parts: string[] = [];
    if (acf.potek_storitev) parts.push(`Potek: ${formatACFDate(String(acf.potek_storitev))}`);
    if (acf.strosek) parts.push(`${acf.strosek} €`);
    if (acf.strosek_obracun) {
      const obr: Record<string, string> = { letno: "letno", mesecno: "mes.", trimesecno: "trimesečno", polletno: "polletno", po_dogovoru: "po dogovoru" };
      const v = Array.isArray(acf.strosek_obracun) ? acf.strosek_obracun[0] : String(acf.strosek_obracun);
      if (v) parts.push(obr[v] || v);
    }
    if (acf.opombe) parts.push(String(acf.opombe).slice(0, 40) + (String(acf.opombe).length > 40 ? "…" : ""));
    if (!parts.length) return null;
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3 }}>
        {parts.map((p, i) => (
          <span key={i} style={{ fontSize: 11, color: "#888" }}>{p}</span>
        ))}
      </div>
    );
  },
  narocnik: (acf) => {
    const parts: string[] = [];
    if (acf.narocnik_kontaktna_oseba) parts.push(String(acf.narocnik_kontaktna_oseba));
    if (acf.narocnik_naslov) parts.push(String(acf.narocnik_naslov));
    if (!parts.length) return null;
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3 }}>
        {parts.map((p, i) => (
          <span key={i} style={{ fontSize: 11, color: "#888" }}>{p}</span>
        ))}
      </div>
    );
  },
};


// ============================================================
// HOOK: zaznaj mobilno napravo
// ============================================================
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ============================================================
// SKUPNI STILI
// ============================================================
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 14,
  color: "#111",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600 as const,
  color: "#555",
  marginBottom: 4,
  display: "block" as const,
};

// ============================================================
// SKUPNE MODAL KOMPONENTE — usklajene s stilom OpravilaSection
// ============================================================
function ModalWrapper({ title, subtitle, onClose, onSave, saving, saveLabel, children }: {
  title: string; subtitle?: string; onClose: () => void;
  onSave: () => void; saving: boolean; saveLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(560px, 92vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555", fontWeight: 500 }}>
            Prekliči
          </button>
          <button onClick={onSave} disabled={saving} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: saving ? "#99d6d8" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Shranjujem..." : (saveLabel || "Shrani spremembe")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13, border: "1px solid #fecaca" }}>⚠️ {msg}</div>;
}

// ============================================================
// UREDI NAROČNIK MODAL
// ============================================================
type NarocnikPost = {
  id: number;
  title: { rendered: string };
  acf?: {
    narocnik_naziv?: string;
    narocnik_kontaktna_oseba?: string;
    narocnik_email?: string;
    narocnik_telefonska_stevilka?: string;
    narocnik_naslov?: string;
    narocnik_postna_stevilka?: string;
    narocnik_posta?: string;
    narocnik_davcna_stevilka?: string;
  };
};

function UrediNarocnikModal({ post, onClose, onSaved }: { post: NarocnikPost; onClose: () => void; onSaved: () => void }) {
  const rawTitle = post.title.rendered.replace(/<[^>]*>/g, "");
  const [title, setTitle] = useState(rawTitle);
  const [kontaktna, setKontaktna] = useState(post.acf?.narocnik_kontaktna_oseba || "");
  const [email, setEmail] = useState(post.acf?.narocnik_email || "");
  const [telefon, setTelefon] = useState(post.acf?.narocnik_telefonska_stevilka || "");
  const [naslov, setNaslov] = useState(post.acf?.narocnik_naslov || "");
  const [postna, setPostna] = useState(post.acf?.narocnik_postna_stevilka || "");
  const [posta, setPosta] = useState(post.acf?.narocnik_posta || "");
  const [davcna, setDavcna] = useState(post.acf?.narocnik_davcna_stevilka || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError("Naziv je obvezen"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/narocnik/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          title: title.trim(),
          narocnik_kontaktna_oseba: kontaktna.trim(),
          narocnik_email: email.trim(),
          narocnik_telefonska_stevilka: telefon.trim(),
          narocnik_naslov: naslov.trim(),
          narocnik_postna_stevilka: postna.trim(),
          narocnik_posta: posta.trim(),
          narocnik_davcna_stevilka: davcna.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Napaka pri shranjevanju"); return; }
      onSaved(); onClose();
    } catch { setError("Napaka pri shranjevanju"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper title="Uredi naročnika" subtitle={rawTitle} onClose={onClose} onSave={handleSave} saving={saving}>
      <FormField label="Naziv naročnika" required>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naziv podjetja ali osebe" />
      </FormField>
      <FormField label="Kontaktna oseba">
        <input style={inputStyle} value={kontaktna} onChange={(e) => setKontaktna(e.target.value)} placeholder="Ime in priimek" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Email">
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="janez@podjetje.si" />
        </FormField>
        <FormField label="Telefon">
          <input style={inputStyle} value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+386 41 123 456" />
        </FormField>
      </div>
      <FormField label="Naslov">
        <input style={inputStyle} value={naslov} onChange={(e) => setNaslov(e.target.value)} placeholder="Ulica in hišna številka" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
        <FormField label="Poštna številka">
          <input style={inputStyle} value={postna} onChange={(e) => setPostna(e.target.value)} placeholder="5000" maxLength={4} />
        </FormField>
        <FormField label="Pošta">
          <input style={inputStyle} value={posta} onChange={(e) => setPosta(e.target.value)} placeholder="Nova Gorica" />
        </FormField>
      </div>
      <FormField label="Davčna številka">
        <input style={inputStyle} value={davcna} onChange={(e) => setDavcna(e.target.value)} placeholder="SI12345678" />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}

// ============================================================
// UREDI STRANKA MODAL
// ============================================================
type StrankaPost = {
  id: number;
  title: { rendered: string };
  acf?: {
    stanje_storitve?: boolean;
    storitve?: string[];
    stanje_vzdrzevanja?: boolean;
    domena_url?: string;
    potek_storitev?: string;
    strosek?: number | string;
    strosek_obracun?: string[];
    opombe?: string;
  };
};

const STORITVE_CHOICES = [
  { value: "domena", label: "Domena" },
  { value: "gostovanje", label: "Gostovanje" },
  { value: "dom_gos", label: "Domena & gostovanje" },
  { value: "vzdrzevanje", label: "Vzdrževanje" },
];

const OBRACUN_CHOICES = [
  { value: "letno", label: "Letno" },
  { value: "mesecno", label: "Mesečno" },
  { value: "trimesecno", label: "Trimesečno (3)" },
  { value: "polletno", label: "Polletno (6)" },
  { value: "po_dogovoru", label: "Po dogovoru" },
];

function UrediStrankaModal({ post, onClose, onSaved }: { post: StrankaPost; onClose: () => void; onSaved: () => void }) {
  const rawTitle = post.title.rendered.replace(/<[^>]*>/g, "");
  const [title, setTitle] = useState(rawTitle);
  const [stanjeStoritve, setStanjeStoritve] = useState(post.acf?.stanje_storitve ?? true);
  const [storitve, setStoritve] = useState<string[]>(post.acf?.storitve || []);
  const [stanjeVzdrzevanja, setStanjeVzdrzevanja] = useState(post.acf?.stanje_vzdrzevanja ?? true);
  const [domenaUrl, setDomenaUrl] = useState(post.acf?.domena_url || "");
  const acfDate = post.acf?.potek_storitev || "";
  const initDate = acfDate.length === 8 ? `${acfDate.slice(0, 4)}-${acfDate.slice(4, 6)}-${acfDate.slice(6, 8)}` : acfDate;
  const [potekStoritev, setPotekStoritev] = useState(initDate);
  const [strosek, setStrosek] = useState(String(post.acf?.strosek ?? ""));
  const [strosekObracun, setStrosekObracun] = useState<string[]>(post.acf?.strosek_obracun || []);
  const [opombe, setOpombe] = useState(post.acf?.opombe || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasVzdrzevanje = storitve.includes("vzdrzevanje");
  const hasDomena = storitve.some((s) => ["domena", "dom_gos", "vzdrzevanje"].includes(s));

  const toggleStoritev = (val: string) => setStoritve((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);
  const toggleObracun = (val: string) => setStrosekObracun((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);

  const handleSave = async () => {
    if (!title.trim()) { setError("Naziv je obvezen"); return; }
    setSaving(true); setError("");
    const potekAcf = potekStoritev.replace(/-/g, "");
    try {
      const res = await fetch("/api/stranka/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, title: title.trim(), stanje_storitve: stanjeStoritve, storitve, stanje_vzdrzevanja: stanjeVzdrzevanja, domena_url: domenaUrl.trim(), potek_storitev: potekAcf, strosek: strosek !== "" ? Number(strosek) : "", strosek_obracun: strosekObracun, opombe: opombe.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Napaka pri shranjevanju"); return; }
      onSaved(); onClose();
    } catch { setError("Napaka pri shranjevanju"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper title="Uredi stranko" subtitle={rawTitle} onClose={onClose} onSave={handleSave} saving={saving}>
      <FormField label="Naziv stranke" required>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naziv stranke" />
      </FormField>

      {/* Stanje storitve toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Stanje storitve</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{stanjeStoritve ? "Aktivna" : "Neaktivna"}</div>
        </div>
        <button onClick={() => setStanjeStoritve(!stanjeStoritve)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: stanjeStoritve ? BRAND : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: stanjeStoritve ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>

      {/* Storitve — pill-i */}
      <FormField label="Storitve">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STORITVE_CHOICES.map(({ value, label }) => (
            <div key={value} onClick={() => toggleStoritev(value)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500,
              border: `1.5px solid ${storitve.includes(value) ? BRAND : "#e5e7eb"}`,
              background: storitve.includes(value) ? `${BRAND}12` : "#fff",
              color: storitve.includes(value) ? BRAND : "#555",
            }}>{label}</div>
          ))}
        </div>
      </FormField>

      {hasVzdrzevanje && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Stanje vzdrževanja</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{stanjeVzdrzevanja ? "Aktivno" : "Neaktivno"}</div>
          </div>
          <button onClick={() => setStanjeVzdrzevanja(!stanjeVzdrzevanja)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: stanjeVzdrzevanja ? BRAND : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: stanjeVzdrzevanja ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {hasDomena && (
          <FormField label="Domena URL">
            <input style={inputStyle} value={domenaUrl} onChange={(e) => setDomenaUrl(e.target.value)} placeholder="https://primer.si" type="url" />
          </FormField>
        )}
        <FormField label="Potek storitev">
          <input style={inputStyle} value={potekStoritev} onChange={(e) => setPotekStoritev(e.target.value)} type="date" />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Strošek (€)">
          <input style={inputStyle} value={strosek} onChange={(e) => setStrosek(e.target.value)} type="number" min="0" placeholder="0" />
        </FormField>
        <FormField label="Obračun">
          <select style={inputStyle} value={strosekObracun[0] || "letno"} onChange={(e) => setStrosekObracun([e.target.value])}>
            {OBRACUN_CHOICES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Opombe">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const, fontFamily: "inherit" }} value={opombe} onChange={(e) => setOpombe(e.target.value)} placeholder="Interne opombe..." />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}

// ============================================================
// DATA TABLE — MOBILNE KARTICE + DESKTOP TABELA
// ============================================================
type AnyPost = NarocnikPost & StrankaPost & { slug: string; date: string; status: string; acf?: Record<string, ColValue> };

export function DataTable({ cptSlug, onAdd }: { cptSlug: string; onAdd?: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; naziv: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<AnyPost | null>(null);
  const isMobile = useIsMobile();

  const { posts, loading, error, total, totalPages, refetch } = useWPData(cptSlug, page, perPage);
  const isSearching = search.trim().length > 0;
  const { posts: allPosts, loading: allLoading, error: allError, refetch: refetchAll } = useAllWPData(cptSlug, isSearching);

  const effectiveLoading = isSearching ? allLoading : loading;
  const effectiveError = isSearching ? allError : error;

  useEffect(() => { setPage(1); }, [cptSlug, search]);

  const filtered = useMemo(() => {
    const source = isSearching ? allPosts : posts;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((p) => {
      const title = p.title.rendered.toLowerCase();
      const acfText = p.acf ? JSON.stringify(p.acf).toLowerCase() : "";
      return title.includes(q) || acfText.includes(q);
    });
  }, [isSearching, allPosts, posts, search]);

  const handleRefresh = async () => { if (isSearching) await refetchAll(); else await refetch(); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, cptSlug, title: deleteTarget.naziv }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Napaka pri brisanju"); return; }
      setDeleteTarget(null);
      if (isSearching) await refetchAll(); else await refetch();
    } finally { setDeleting(false); }
  };

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(page * perPage, total);

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteDialog naziv={deleteTarget.naziv} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
      )}
      {editTarget && cptSlug === "narocnik" && (
        <UrediNarocnikModal post={editTarget as NarocnikPost} onClose={() => setEditTarget(null)} onSaved={handleRefresh} />
      )}
      {editTarget && cptSlug === "stranka" && (
        <UrediStrankaModal post={editTarget as StrankaPost} onClose={() => setEditTarget(null)} onSaved={handleRefresh} />
      )}

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: "#aaa" }}>{icons.search}</div>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Iskanje..."
            style={{ border: "none", outline: "none", fontSize: 14, color: "#333", background: "transparent", flex: 1, minWidth: 0 }}
          />
          {!isMobile && (
            <span style={{ fontSize: 12, color: "#aaa", whiteSpace: "nowrap" }}>
              {search.trim() ? `${filtered.length} rezultatov` : `Prikaz ${from}–${to} od ${total} zapisov`}
            </span>
          )}
          <button onClick={handleRefresh} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center", flexShrink: 0 }} title="Osveži">
            {icons.refresh}
          </button>
          {onAdd && (
            <button onClick={onAdd} style={{ padding: isMobile ? "7px 10px" : "7px 14px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
              + {!isMobile ? "Dodaj" : ""}
            </button>
          )}
        </div>

        {effectiveError && (
          <div style={{ padding: 20, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠️ Napaka: {effectiveError}</div>
        )}

        {effectiveLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje iz WordPressa...</div>
        )}

        {!effectiveLoading && !effectiveError && filtered.length > 0 && (
          isMobile ? (
            /* ── MOBILNI PRIKAZ: kartice ── */
            <div>
              {filtered.map((post, i) => {
                const acf = (post.acf || {}) as Record<string, ColValue>;
                const cols = CPT_COLUMNS[cptSlug] || [];
                const subtitleFn = CPT_SUBTITLE[cptSlug];
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f5f5f5" : "none",
                    }}
                  >
                    {/* Naslov + podrobnosti */}
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                    {subtitleFn && subtitleFn(acf)}

                    {/* Dinamični stolpci kot inline pills */}
                    {cols.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                        {cols.filter(c => !c.hideOnMobile).map((col) => (
                          <span key={col.label}>
                            {col.render
                              ? col.render(acf, post as AnyPost)
                              : <span style={{ fontSize: 12, color: "#555" }}>{col.key && acf[col.key] != null ? String(acf[col.key]) : null}</span>
                            }
                          </span>
                        ))}
                      </div>
                    )}

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#aaa" }}>{formatDate(post.date)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {EDITABLE.includes(cptSlug) && (
                          <button
                            onClick={() => setEditTarget(post as AnyPost)}
                            style={{ fontSize: 13, color: BRAND, fontWeight: 600, border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: BRAND + "15" } as React.CSSProperties}
                          >
                            Uredi
                          </button>
                        )}
                        <a href={`/cpt/${cptSlug}/${post.slug}`} style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, textDecoration: "none", padding: "6px 10px", borderRadius: 8, background: "#f3f4f6" }}>
                          Poglej
                        </a>
                        {DELETABLE.includes(cptSlug) && (
                          <button
                            onClick={() => setDeleteTarget({ id: post.id, naziv: post.title.rendered.replace(/<[^>]*>/g, "") })}
                            title="Premakni v koš"
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#d1d5db", padding: 6, borderRadius: 6, display: "flex" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
                          >
                            {icons.trash}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── DESKTOP PRIKAZ: tabela z dinamičnimi stolpci ── */
            (() => {
              const cols = CPT_COLUMNS[cptSlug] || [];
              const subtitleFn = CPT_SUBTITLE[cptSlug];
              return (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th style={{ padding: "11px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0" }}>Naslov</th>
                      {cols.map((col) => (
                        <th key={col.label} style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0", width: col.width, whiteSpace: "nowrap" }}>{col.label}</th>
                      ))}
                      <th style={{ padding: "11px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0" }}>Datum</th>
                      <th style={{ padding: "11px 20px", width: 80, borderBottom: "1px solid #f0f0f0" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((post, i) => {
                      const acf = (post.acf || {}) as Record<string, ColValue>;
                      return (
                        <tr key={post.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f7f7f7" : "none" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                            {subtitleFn && subtitleFn(acf)}
                          </td>
                          {cols.map((col) => (
                            <td key={col.label} style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                              {col.render
                                ? col.render(acf, post as AnyPost)
                                : <span style={{ fontSize: 13, color: "#555" }}>{col.key && acf[col.key] != null ? String(acf[col.key]) : "—"}</span>
                              }
                            </td>
                          ))}
                          <td style={{ padding: "14px 20px", fontSize: 13, color: "#666", whiteSpace: "nowrap" }}>{formatDate(post.date)}</td>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {EDITABLE.includes(cptSlug) && (
                                <button onClick={() => setEditTarget(post as AnyPost)} style={{ fontSize: 13, color: BRAND, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0, whiteSpace: "nowrap" }}>
                                  Uredi {icons.arrow}
                                </button>
                              )}
                              <a href={`/cpt/${cptSlug}/${post.slug}`} style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
                                Poglej {icons.arrow}
                              </a>
                              {DELETABLE.includes(cptSlug) && (
                                <button onClick={() => setDeleteTarget({ id: post.id, naziv: post.title.rendered.replace(/<[^>]*>/g, "") })} title="Premakni v koš"
                                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
                                >
                                  {icons.trash}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()
          )
        )}

        {!effectiveLoading && !effectiveError && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
            {search ? `Ni rezultatov za "${search}"` : "Ni zapisov"}
          </div>
        )}

        {/* Paginacija */}
        {!effectiveLoading && !effectiveError && !search.trim() && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "12px 14px" : "14px 20px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: page === 1 ? "#f9fafb" : "#fff", color: page === 1 ? "#9ca3af" : "#374151", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500 }}>
              ← {!isMobile && "Prejšnja"}
            </button>
            {isMobile ? (
              <span style={{ fontSize: 13, color: "#888" }}>{page} / {totalPages}</span>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isActive = p === page;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ minWidth: 34, height: 34, padding: "0 10px", borderRadius: 8, border: isActive ? `1px solid ${BRAND}` : "1px solid #e5e7eb", background: isActive ? BRAND : "#fff", color: isActive ? "#fff" : "#374151", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500 }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: page === totalPages ? "#f9fafb" : "#fff", color: page === totalPages ? "#9ca3af" : "#374151", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500 }}>
              {!isMobile && "Naslednja"} →
            </button>
          </div>
        )}
      </div>
    </>
  );
}