"use client";
// components/admin/DataTable.tsx
// Generična tabela za prikaz CPT postov z iskanjem in paginacijo
// Mobilno prilagojena verzija — kartice namesto tabel na mobilnih napravah

import { useState, useMemo, useEffect } from "react";
import { useWPData, useAllWPData } from "@/hooks/useWPData";
import { formatDate, getAcfPreview } from "@/lib/helpers";
import { BRAND } from "@/lib/constants";
import { icons } from "./Icons";
import { StatusBadge, ConfirmDeleteDialog } from "./UI";

const DELETABLE = ["narocnik", "stranka", "ponudba"];
const EDITABLE = ["narocnik", "stranka"];

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
// SKUPNE MODAL KOMPONENTE (mobilno prilagojene)
// ============================================================
function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        zIndex: 1000, display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff",
        borderRadius: isMobile ? "20px 20px 0 0" : 16,
        padding: isMobile ? "24px 20px 32px" : 32,
        width: "100%",
        maxWidth: isMobile ? "100%" : 520,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        maxHeight: isMobile ? "92vh" : "90vh",
        overflowY: "auto",
      }}>
        {/* Mobilni "drag handle" */}
        {isMobile && (
          <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 20px" }} />
        )}
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#111" }}>{title}</div>
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>{subtitle}</div>
      </div>
      <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 22, color: "#aaa", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
    </div>
  );
}

function ModalFooter({ error, saving, onClose, onSave }: { error: string; saving: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <>
      {error && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#555", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
          Prekliči
        </button>
        <button onClick={onSave} disabled={saving} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: saving ? "#9ca3af" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", flex: 1 }}>
          {saving ? "Shranjujem..." : "Shrani spremembe"}
        </button>
      </div>
    </>
  );
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
        body: JSON.stringify({ id: post.id, title: title.trim(), narocnik_kontaktna_oseba: kontaktna.trim(), narocnik_naslov: naslov.trim(), narocnik_postna_stevilka: postna.trim(), narocnik_posta: posta.trim(), narocnik_davcna_stevilka: davcna.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Napaka pri shranjevanju"); return; }
      onSaved(); onClose();
    } catch { setError("Napaka pri shranjevanju"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader title="Uredi naročnika" subtitle={rawTitle} onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Naziv naročnika *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naziv podjetja ali osebe" />
        </div>
        <div>
          <label style={labelStyle}>Kontaktna oseba</label>
          <input style={inputStyle} value={kontaktna} onChange={(e) => setKontaktna(e.target.value)} placeholder="Ime in priimek" />
        </div>
        <div>
          <label style={labelStyle}>Naslov</label>
          <input style={inputStyle} value={naslov} onChange={(e) => setNaslov(e.target.value)} placeholder="Ulica in hišna številka" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Poštna številka</label>
            <input style={inputStyle} value={postna} onChange={(e) => setPostna(e.target.value)} placeholder="1000" maxLength={4} />
          </div>
          <div>
            <label style={labelStyle}>Pošta</label>
            <input style={inputStyle} value={posta} onChange={(e) => setPosta(e.target.value)} placeholder="Ljubljana" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Davčna številka</label>
          <input style={inputStyle} value={davcna} onChange={(e) => setDavcna(e.target.value)} placeholder="SI12345678" />
        </div>
      </div>
      <ModalFooter error={error} saving={saving} onClose={onClose} onSave={handleSave} />
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
    <ModalWrapper onClose={onClose}>
      <ModalHeader title="Uredi stranko" subtitle={rawTitle} onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Naziv stranke *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naziv stranke" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Stanje storitve</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{stanjeStoritve ? "Aktivno" : "Neaktivno"}</div>
          </div>
          <button onClick={() => setStanjeStoritve(!stanjeStoritve)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: stanjeStoritve ? BRAND : "#d1d5db", position: "relative", transition: "background 0.2s" }}>
            <span style={{ position: "absolute", top: 2, left: stanjeStoritve ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
        <div>
          <label style={labelStyle}>Storitve</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STORITVE_CHOICES.map(({ value, label }) => (
              <label key={value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
                <input type="checkbox" checked={storitve.includes(value)} onChange={() => toggleStoritev(value)} style={{ width: 16, height: 16, accentColor: BRAND }} />
                {label}
              </label>
            ))}
          </div>
        </div>
        {hasVzdrzevanje && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Stanje vzdrževanja</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>{stanjeVzdrzevanja ? "Aktivno" : "Neaktivno"}</div>
            </div>
            <button onClick={() => setStanjeVzdrzevanja(!stanjeVzdrzevanja)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: stanjeVzdrzevanja ? BRAND : "#d1d5db", position: "relative", transition: "background 0.2s" }}>
              <span style={{ position: "absolute", top: 2, left: stanjeVzdrzevanja ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
          </div>
        )}
        {hasDomena && (
          <div>
            <label style={labelStyle}>Domena URL</label>
            <input style={inputStyle} value={domenaUrl} onChange={(e) => setDomenaUrl(e.target.value)} placeholder="https://primer.si" type="url" />
          </div>
        )}
        <div>
          <label style={labelStyle}>Potek storitev</label>
          <input style={inputStyle} value={potekStoritev} onChange={(e) => setPotekStoritev(e.target.value)} type="date" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Strošek (€)</label>
            <input style={inputStyle} value={strosek} onChange={(e) => setStrosek(e.target.value)} type="number" min="0" placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>Obračunavanje</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {OBRACUN_CHOICES.map(({ value, label }) => (
                <label key={value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#333" }}>
                  <input type="checkbox" checked={strosekObracun.includes(value)} onChange={() => toggleObracun(value)} style={{ width: 14, height: 14, accentColor: BRAND }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Opombe</label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }} value={opombe} onChange={(e) => setOpombe(e.target.value)} placeholder="Dodatne opombe..." />
        </div>
      </div>
      <ModalFooter error={error} saving={saving} onClose={onClose} onSave={handleSave} />
    </ModalWrapper>
  );
}

// ============================================================
// DATA TABLE — MOBILNE KARTICE + DESKTOP TABELA
// ============================================================
type AnyPost = NarocnikPost & StrankaPost & { slug: string; date: string; status: string };

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
                const acfPreview = getAcfPreview(post.acf);
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f5f5f5" : "none",
                    }}
                  >
                    {/* Naslov + status */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111", flex: 1 }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                      <StatusBadge status={post.status} />
                    </div>

                    {/* ACF preview — skrit na mobilnem */}

                    {/* Datum + akcije */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#aaa" }}>{formatDate(post.date)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {EDITABLE.includes(cptSlug) ? (
                          <button
                            onClick={() => setEditTarget(post as AnyPost)}
                            style={{ fontSize: 13, color: BRAND, fontWeight: 600, border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: BRAND + "15" } as React.CSSProperties}
                          >
                            Uredi
                          </button>
                        ) : (
                          <a href={`/cpt/${cptSlug}/${post.slug}`} style={{ fontSize: 13, color: BRAND, fontWeight: 600, textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: BRAND + "15" }}>
                            Odpri
                          </a>
                        )}
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
            /* ── DESKTOP PRIKAZ: tabela ── */
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Naslov", "Datum", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((post, i) => {
                  const acfPreview = getAcfPreview(post.acf);
                  return (
                    <tr key={post.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f7f7f7" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                        {acfPreview.length > 0 && (
                          <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                            {acfPreview.map(([key, val]) => (
                              <span key={key} style={{ fontSize: 11, color: "#888" }}>
                                <span style={{ color: "#bbb" }}>{key}: </span>{String(val)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#666" }}>{formatDate(post.date)}</td>
                      <td style={{ padding: "14px 20px" }}><StatusBadge status={post.status} /></td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {EDITABLE.includes(cptSlug) ? (
                            <button onClick={() => setEditTarget(post as AnyPost)} style={{ fontSize: 13, color: BRAND, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0 }}>
                              Uredi {icons.arrow}
                            </button>
                          ) : (
                            <a href={`/cpt/${cptSlug}/${post.slug}`} style={{ fontSize: 13, color: BRAND, fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                              Odpri {icons.arrow}
                            </a>
                          )}
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
