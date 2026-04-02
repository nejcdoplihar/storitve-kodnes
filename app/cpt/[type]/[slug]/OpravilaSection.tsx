"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
//import { DodajOpraviloModal, OpravilaTabela } from "@/components/admin/views/OpravilaView";

const BRAND = "#00a4a7";

// ============================================================
// TYPES
// ============================================================
type Post = {
  id: number;
  slug: string;
  title: { rendered: string };
  acf?: Record<string, unknown>;
};

type Opravilo = {
  id: number;
  slug: string;
  title: { rendered: string };
  acf: {
    datum_opravila: string;
    uporabnik: string;
    naslov_opravila: string;
    opis_opravila: string;
    cas_ure: number;
    custom_postavka: boolean;
    urna_postavka: number;
    narocnik_rel?: number[];
    stranka_rel?: number[];
    placano: boolean;
  };
};

type StrankaACF = {
  stanje_storitve?: boolean;
  storitve?: string[] | string;
  domena_url?: string;
  potek_storitev?: string;
  strosek?: number | string;
  strosek_obracun?: string[] | string;
  opombe?: string;
};

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";

const STORITVE_OPTIONS = [
  { slug: "domena", label: "Domena" },
  { slug: "gostovanje", label: "Gostovanje" },
  { slug: "dom_gos", label: "Domena & gostovanje" },
  { slug: "vzdrzevanje", label: "Vzdrževanje" },
];

const OBRACUN_OPTIONS = [
  { slug: "letno", label: "Letno" },
  { slug: "mesecno", label: "Mesečno" },
  { slug: "trimesecno", label: "Trimesečno" },
  { slug: "polletno", label: "Polletno" },
  { slug: "po_dogovoru", label: "Po dogovoru" },
];

const CAS_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5);

// ============================================================
// HELPERS
// ============================================================


function fmtDate(d: string): string {
  if (!d || d.length !== 8) return d || "—";
  return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`).toLocaleDateString("sl-SI");
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

function stripHtml(html?: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function getStoritevLabel(value: unknown) {
  const labels: Record<string, string> = {
    domena: "Domena",
    gostovanje: "Gostovanje",
    dom_gos: "Domena & gostovanje",
    vzdrzevanje: "Vzdrževanje",
  };

  if (!value) return "—";
  if (Array.isArray(value)) return value.map((v) => labels[String(v)] || String(v)).join(", ");
  return labels[String(value)] || String(value);
}

function getTitleById(list: Post[], id?: number) {
  if (!id) return "—";
  const item = list.find((p) => p.id === id);
  return item ? stripHtml(item.title.rendered) : "—";
}

// ============================================================
// SHARED STYLES
// ============================================================
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  fontSize: 16, // 16px prepreči iOS zoom ob fokusu
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#555",
  display: "block",
  marginBottom: 5,
};

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#888",
  borderBottom: "1px solid #f0f0f0",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "none",
  background: BRAND,
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 14,
  cursor: "pointer",
  color: "#555",
};

// ============================================================
// HOOKS
// ============================================================
function useAllPosts(cpt: "stranka" | "narocnik") {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    async function load() {
      if (!WP_URL) return;
      try {
        const res = await fetch(
          `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${cpt}?per_page=100&_embed=1`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } catch {}
    }

    load();
  }, [cpt]);

  return posts;
}

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

function useCurrentUser() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.username || ""))
      .catch(() => setUsername(""));
  }, []);

  return username;
}

function useOpravila(entityId?: number, entityType?: "narocnik" | "stranka") {
  const [opravila, setOpravila] = useState<Opravilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!WP_URL) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo?per_page=100&_embed=1&acf_format=standard`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      let data: Opravilo[] = await res.json();

      if (entityId && entityType) {
        const relField = entityType === "narocnik" ? "narocnik_rel" : "stranka_rel";
        data = data.filter((o) => {
          const rel = o.acf?.[relField];
          if (!Array.isArray(rel)) return false;
          return rel.some((r) => Number(r) === entityId);
        });
      }

      data.sort((a, b) => (b.acf?.datum_opravila || "").localeCompare(a.acf?.datum_opravila || ""));
      setOpravila(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [entityId, entityType]);

  return { opravila, loading, error, refetch: fetchData };
}

// ============================================================
// LOGO UPLOAD FIELD
// ============================================================
function LogoUploadField({
  currentUrl,
  onUploaded,
}: {
  currentUrl?: string | null;
  onUploaded: (id: number, url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload napaka");
      }

      const mediaId = Number(data.id ?? data.mediaId ?? data.attachment_id ?? 0);
      const mediaUrl = data.url ?? data.source_url ?? localUrl;

      if (!mediaId) {
        throw new Error("Upload je uspel, ampak API ni vrnil ID-ja slike.");
      }

      onUploaded(mediaId, mediaUrl);
      setPreview(mediaUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload napaka");
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${preview ? BRAND : "#e5e7eb"}`,
          borderRadius: 10,
          padding: 16,
          cursor: "pointer",
          background: preview ? `${BRAND}08` : "#fafafa",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="logo preview"
              style={{
                width: 56,
                height: 56,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #f0f0f0",
                background: "#fff",
                padding: 4,
              }}
            />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: uploading ? "#aaa" : "#111" }}>
                {uploading ? "Nalagam v WordPress..." : "✓ Logotip pripravljen"}
              </div>
              <div style={{ fontSize: 12, color: BRAND, marginTop: 2 }}>Klikni za zamenjavo</div>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", color: "#888", fontSize: 13, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📁</div>
            <div>Klikni za nalaganje logotipa</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>JPG, PNG, SVG, WebP — max 5MB</div>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ============================================================
// SHARED MODAL WRAPPER
// ============================================================
function ModalWrapper({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
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
          borderRadius: 16,
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{title}</div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", display: "flex", padding: 4 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>

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
      </div>
    </div>
  );
}

function mapStrankaToForm(post: {
  title?: { rendered?: string };
  acf?: Record<string, unknown>;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
}) {
  const acf = post.acf || {};

  return {
    title: stripHtml(post.title?.rendered || ""),
    storitve: normalizeStringArray(acf.storitve),
    domena_url: typeof acf.domena_url === "string" ? acf.domena_url : "",
    potek_storitev: typeof acf.potek_storitev === "string" ? acf.potek_storitev : "",
    stanje_storitve: typeof acf.stanje_storitve === "boolean" ? acf.stanje_storitve : true,
    strosek:
      acf.strosek !== null && acf.strosek !== undefined && acf.strosek !== ""
        ? String(acf.strosek)
        : "",
    strosek_obracun:
      normalizeStringArray(acf.strosek_obracun).length > 0
        ? normalizeStringArray(acf.strosek_obracun)
        : ["letno"],
    opombe: typeof acf.opombe === "string" ? acf.opombe : "",
    logoUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
  };
}

// ============================================================
// UREDI STRANKO MODAL
// ============================================================
function UrediStrankoModal({
  strankaId,
  onClose,
}: {
  strankaId: number;
  onClose: () => void;
}) {
  const router = useRouter();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    datum_opravila: todayYMD(),
    naslov_opravila: "",
    opis_opravila: "",
    cas_ure: "0.5",
    custom_postavka: false,
    urna_postavka: "35",
    stranka_id: "",
    narocnik_id: "",
    placano: false,
  });

  const [logoId, setLogoId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const set = (k: string, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));



  useEffect(() => {
    async function loadFreshStranka() {
      if (!WP_URL || !strankaId) return;

      setLoadingInitial(true);
      setError("");

      try {
        const res = await fetch(
          `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/stranka/${strankaId}?_embed=1`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Napaka pri nalaganju podatkov stranke.");
        }

        const data = await res.json();
        const mapped = mapStrankaToForm(data);

        setForm({
          title: mapped.title,
          storitve: mapped.storitve,
          domena_url: mapped.domena_url,
          potek_storitev: mapped.potek_storitev,
          stanje_storitve: mapped.stanje_storitve,
          strosek: mapped.strosek,
          strosek_obracun: mapped.strosek_obracun,
          opombe: mapped.opombe,
        });

        setLogoUrl(mapped.logoUrl);
        setLogoId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Napaka pri nalaganju.");
      } finally {
        setLoadingInitial(false);
      }
    }

    loadFreshStranka();
  }, [strankaId]);

const handleSave = async () => {
  if (!form.naslov_opravila.trim()) {
    setError("Naslov opravila je obvezen");
    return;
  }

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
        narocnik_id: form.narocnik_id ? parseInt(form.narocnik_id) : null,
        cas_ure: parseFloat(form.cas_ure),
        urna_postavka: parseFloat(form.urna_postavka) || 35,
        clear_stranka_rel: !form.stranka_id,
        clear_narocnik_rel: !form.narocnik_id,
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
    <ModalWrapper
      title="Uredi stranko"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={secondaryButtonStyle}>
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingInitial || !!success}
            style={{
              ...primaryButtonStyle,
              background: saving || loadingInitial || success ? "#99d6d8" : BRAND,
              cursor: saving || loadingInitial || success ? "default" : "pointer",
            }}
          >
            {loadingInitial
              ? "Nalaganje..."
              : saving
              ? "Shranjujem..."
              : success
              ? "Posodobljeno"
              : "Shrani spremembe"}
          </button>
        </>
      }
    >
      {loadingInitial ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "#888", fontSize: 14 }}>
          Nalaganje podatkov stranke...
        </div>
      ) : (
        <>
          <div>
            <label style={labelStyle}>Naziv stranke</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Naziv stranke"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Logotip</label>
            <LogoUploadField
              currentUrl={logoUrl}
              onUploaded={(id, url) => {
                setLogoId(id);
                setLogoUrl(url);
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Storitev</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STORITVE_OPTIONS.map((s) => (
                <div
                  key={s.slug}
                  onClick={() => toggleStoritev(s.slug)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 500,
                    border: `1.5px solid ${form.storitve.includes(s.slug) ? BRAND : "#e5e7eb"}`,
                    background: form.storitve.includes(s.slug) ? `${BRAND}12` : "#fff",
                    color: form.storitve.includes(s.slug) ? BRAND : "#555",
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Domena URL</label>
              <input
                value={form.domena_url}
                onChange={(e) => set("domena_url", e.target.value)}
                placeholder="https://domena.si"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Potek storitev</label>
              <input
                type="date"
                value={
                  form.potek_storitev
                    ? `${form.potek_storitev.slice(0, 4)}-${form.potek_storitev.slice(4, 6)}-${form.potek_storitev.slice(6, 8)}`
                    : ""
                }
                onChange={(e) => set("potek_storitev", e.target.value.replace(/-/g, ""))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Strošek (€)</label>
              <input
                type="number"
                value={form.strosek}
                onChange={(e) => set("strosek", e.target.value)}
                placeholder="150"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Obračun</label>
              <select
                value={form.strosek_obracun[0] || "letno"}
                onChange={(e) => set("strosek_obracun", [e.target.value])}
                style={inputStyle}
              >
                {OBRACUN_OPTIONS.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Stanje storitve</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                onClick={() => set("stanje_storitve", !form.stanje_storitve)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: form.stanje_storitve ? BRAND : "#d1d5db",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: form.stanje_storitve ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: "#555" }}>
                {form.stanje_storitve ? "Aktivna" : "Neaktivna"}
              </span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Opombe</label>
            <textarea
              value={form.opombe}
              onChange={(e) => set("opombe", e.target.value)}
              rows={3}
              placeholder="Interne opombe..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </>
      )}

      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ color: "#166534", fontSize: 13, padding: "8px 12px", background: "#dcfce7", borderRadius: 8 }}>
          ✓ {success}
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================
// UREDI STRANKO BUTTON
// ============================================================
export function UrediStrankoButton({ strankaId }: { strankaId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: BRAND,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Uredi stranko
      </button>

      {open && (
        <UrediStrankoModal
          strankaId={strankaId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ============================================================
// STRANKA SEARCH SELECT
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
    const sorted = [...stranke].sort((a, b) => a.title.rendered.localeCompare(b.title.rendered, "sl"));
    if (!q) return sorted;

    return sorted.filter((s) => {
      const title = stripHtml(s.title.rendered).toLowerCase();
      const domena = String((s.acf as Record<string, unknown>)?.domena_url || "").toLowerCase();
      return title.includes(q) || domena.includes(q);
    });
  }, [stranke, query]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={open ? query : stripHtml(selectedStranka?.title.rendered) || ""}
        onFocus={openDropdown}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) openDropdown();
          if (value) onChange("");
        }}
        placeholder="Iskanje..."
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
                {stripHtml(s.title.rendered)}
              </button>
            ))
          )}
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
  defaultEntityId,
  entityType,
  username,
}: {
  onClose: () => void;
  onSaved: () => void;
  stranke: Post[];
  defaultEntityId?: number;
  entityType: "stranka" | "narocnik";
  username: string;
}) {
  const [form, setForm] = useState({
    datum_opravila: todayYMD(),
    naslov_opravila: "",
    opis_opravila: "",
    cas_ure: "0.5",
    custom_postavka: false,
    urna_postavka: "35",
    stranka_id: entityType === "stranka" && defaultEntityId ? String(defaultEntityId) : "",
    narocnik_id: entityType === "narocnik" && defaultEntityId ? String(defaultEntityId) : "",
    placano: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const idField = entityType === "narocnik" ? "narocnik_id" : "stranka_id";
  const selectedId = (form[idField as keyof typeof form] as string) || "";

  const handleSave = async () => {
    if (!form.naslov_opravila.trim()) {
      setError("Naslov je obvezen");
      return;
    }

    if (!selectedId) {
      setError(entityType === "narocnik" ? "Izberi naročnika." : "Izberi stranko.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/opravilo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          uporabnik: username,
          stranka_id: form.stranka_id ? parseInt(form.stranka_id) : null,
          narocnik_id: form.narocnik_id ? parseInt(form.narocnik_id) : null,
          clear_stranka_rel: !form.stranka_id,
          clear_narocnik_rel: !form.narocnik_id,
        }),
      });

      const raw = await res.text();

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Neveljaven odgovor strežnika." };
      }

      if (!res.ok) {
        throw new Error(data.error || "Napaka");
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
      setSaving(false);
    }
  };

  return (
    <ModalWrapper
      title="Dodaj opravilo"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={secondaryButtonStyle}>
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              background: saving || !selectedId ? "#99d6d8" : BRAND,
              cursor: saving || !selectedId ? "default" : "pointer",
            }}
          >
            {saving ? "Shranjujem..." : "Shrani opravilo"}
          </button>
        </>
      }
    >
      <div>
        <label style={labelStyle}>
          {entityType === "narocnik" ? "Naročnik *" : "Stranka *"}
        </label>
        <StrankaSearchSelect
          stranke={stranke}
          value={selectedId}
          onChange={(val) => set(idField, val)}
        />
      </div>

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
          <input
            value={username}
            disabled
            style={{ ...inputStyle, background: "#f8f9fb", color: "#888" }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Naslov opravila *</label>
        <input
          value={form.naslov_opravila}
          onChange={(e) => set("naslov_opravila", e.target.value)}
          placeholder="npr. Popravek kontaktnega obrazca"
          style={inputStyle}
        />
      </div>

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Porabljen čas</label>
          <select value={form.cas_ure} onChange={(e) => set("cas_ure", e.target.value)} style={inputStyle}>
            {CAS_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v} {v === 1 ? "ura" : v < 5 ? "ure" : "ur"}
              </option>
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

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onClick={() => set("custom_postavka", !form.custom_postavka)}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: `2px solid ${form.custom_postavka ? BRAND : "#d1d5db"}`,
            background: form.custom_postavka ? BRAND : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {form.custom_postavka && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
        </div>
        <label
          onClick={() => set("custom_postavka", !form.custom_postavka)}
          style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
        >
          Drugačna urna postavka
        </label>
      </div>

      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#888" }}>Skupaj za to opravilo:</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
          {(parseFloat(form.cas_ure) * (form.custom_postavka ? parseFloat(form.urna_postavka) || 0 : 35)).toLocaleString(
            "sl-SI",
            { minimumFractionDigits: 2 }
          )} €
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onClick={() => set("placano", !form.placano)}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: `2px solid ${form.placano ? "#16a34a" : "#d1d5db"}`,
            background: form.placano ? "#16a34a" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {form.placano && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
        </div>
        <label
          onClick={() => set("placano", !form.placano)}
          style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
        >
          Že plačano
        </label>
      </div>

      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================
// UREDI OPRAVILO MODAL
// ============================================================
function UrediOpraviloModal({
  
  opravilo,
  onClose,
  onSaved,
  stranke,
  narocniki,
  username,
}: {
  opravilo: Opravilo;
  onClose: () => void;
  onSaved: () => void;
  stranke: Post[];
  narocniki: Post[];
  username: string;
}) {
  
  console.log("OPRAVILO:", opravilo);
  console.log("narocnik_rel:", opravilo.acf?.narocnik_rel);
  console.log("stranka_rel:", opravilo.acf?.stranka_rel);
  const narocnikRel = opravilo.acf?.narocnik_rel;
  const strankaRel = opravilo.acf?.stranka_rel;

  const initNarocnikId =
    Array.isArray(narocnikRel) && narocnikRel[0]
      ? String(narocnikRel[0])
      : "";

  const initStrankaId =
    Array.isArray(strankaRel) && strankaRel[0]
      ? String(strankaRel[0])
      : "";

  const [form, setForm] = useState({
    datum_opravila: opravilo.acf?.datum_opravila || todayYMD(),
    naslov_opravila: opravilo.acf?.naslov_opravila || stripHtml(opravilo.title?.rendered) || "",
    opis_opravila: opravilo.acf?.opis_opravila || "",
    cas_ure: String(opravilo.acf?.cas_ure || "0.5"),
    custom_postavka: Boolean(opravilo.acf?.custom_postavka),
    urna_postavka: String(opravilo.acf?.urna_postavka || 35),
    stranka_id: initStrankaId,
    narocnik_id: initNarocnikId,
    placano: Boolean(opravilo.acf?.placano),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const debugNarocnikRel = JSON.stringify(opravilo.acf?.narocnik_rel ?? null);
  const debugStrankaRel = JSON.stringify(opravilo.acf?.stranka_rel ?? null);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.naslov_opravila.trim()) {
      setError("Naslov je obvezen");
      return;
    }

    if (!form.narocnik_id && !form.stranka_id) {
      setError("Izberi naročnika ali stranko");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/opravilo/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            uporabnik: username,
            stranka_id: form.stranka_id ? parseInt(form.stranka_id) : null,
            narocnik_id: form.narocnik_id ? parseInt(form.narocnik_id) : null,
            clear_stranka_rel: !form.stranka_id,
            clear_narocnik_rel: !form.narocnik_id,
          }),
      });

      const raw = await res.text();

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Neveljaven odgovor strežnika." };
      }

      if (!res.ok) throw new Error(data.error || "Napaka");

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
      setSaving(false);
    }
  };

  return (
    <ModalWrapper
      title="Uredi opravilo"
      onClose={onClose}
      footer={
        <>
          
          <button onClick={onClose} style={secondaryButtonStyle}>
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              background: saving ? "#99d6d8" : BRAND,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Shranjujem..." : "Shrani spremembe"}
          </button>
        </>
      }
    >

      

    <div>
      <label style={labelStyle}>Naročnik</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
          <StrankaSearchSelect
            stranke={narocniki}
            value={form.narocnik_id}
            onChange={(val) => set("narocnik_id", val)}
          />
        </div>

        {true && (
          <button
            type="button"
            onClick={() => set("narocnik_id", "")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Odstrani
          </button>
        )}
      </div>
    </div>

    <div>
      <label style={labelStyle}>Stranka</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StrankaSearchSelect
            stranke={stranke}
            value={form.stranka_id}
            onChange={(val) => set("stranka_id", val)}
          />
        </div>

        {form.stranka_id && (
          <button
            type="button"
            onClick={() => set("stranka_id", "")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Odstrani
          </button>
        )}
      </div>
    </div>

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
          <input value={opravilo.acf?.uporabnik || username} disabled style={{ ...inputStyle, background: "#f8f9fb", color: "#888" }} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Naslov opravila *</label>
        <input
          value={form.naslov_opravila}
          onChange={(e) => set("naslov_opravila", e.target.value)}
          placeholder="npr. Popravek kontaktnega obrazca"
          style={inputStyle}
        />
      </div>

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Porabljen čas</label>
          <select value={form.cas_ure} onChange={(e) => set("cas_ure", e.target.value)} style={inputStyle}>
            {CAS_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v} {v === 1 ? "ura" : v < 5 ? "ure" : "ur"}
              </option>
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

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onClick={() => set("custom_postavka", !form.custom_postavka)}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: `2px solid ${form.custom_postavka ? BRAND : "#d1d5db"}`,
            background: form.custom_postavka ? BRAND : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {form.custom_postavka && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
        </div>
        <label
          onClick={() => set("custom_postavka", !form.custom_postavka)}
          style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
        >
          Drugačna urna postavka
        </label>
      </div>

      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#888" }}>Skupaj za to opravilo:</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
          {(parseFloat(form.cas_ure) * (form.custom_postavka ? parseFloat(form.urna_postavka) || 0 : 35)).toLocaleString(
            "sl-SI",
            { minimumFractionDigits: 2 }
          )} €
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onClick={() => set("placano", !form.placano)}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: `2px solid ${form.placano ? "#16a34a" : "#d1d5db"}`,
            background: form.placano ? "#16a34a" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {form.placano && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
        </div>
        <label
          onClick={() => set("placano", !form.placano)}
          style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
        >
          Že plačano
        </label>
      </div>

        
     

      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================
// OPRAVILA TABELA
// ============================================================
function OpravilaTabela({
  opravila,
  loading,
  error,
  onRefetch,
  onDodaj,
  stranke,
  narocniki,
  username,
}: {
  opravila: Opravilo[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onDodaj: () => void;
  stranke: Post[];
  narocniki: Post[];
  username: string;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [localPlacano, setLocalPlacano] = useState<Record<number, boolean>>({});
  const [editOpravilo, setEditOpravilo] = useState<Opravilo | null>(null);
  const isMobile = useIsMobile();

  const getPlacano = (o: Opravilo) => (localPlacano[o.id] !== undefined ? localPlacano[o.id] : o.acf?.placano);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === opravila.length ? new Set() : new Set(opravila.map((o) => o.id))));
  };

  const updatePlacano = async (ids: number[], placano: boolean) => {
    setBulkLoading(true);
    try {
      await fetch("/api/opravilo/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, placano }),
      });

      const updates: Record<number, boolean> = {};
      ids.forEach((id) => {
        updates[id] = placano;
      });

      setLocalPlacano((prev) => ({ ...prev, ...updates }));
      setSelected(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  const skupajNeplacano = opravila
    .filter((o) => !getPlacano(o))
    .reduce((s, o) => s + (o.acf?.cas_ure || 0) * (o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35), 0);

  const skupajVse = opravila.reduce(
    (s, o) => s + (o.acf?.cas_ure || 0) * (o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35),
    0
  );

  return (
    <div>
      {editOpravilo && (
      <UrediOpraviloModal
        opravilo={editOpravilo}
        onClose={() => setEditOpravilo(null)}
        onSaved={() => {
          setEditOpravilo(null);
          onRefetch();
        }}
        stranke={stranke}
        narocniki={narocniki}
        username={username}
      />
      )}
      <div style={{ marginBottom: 16 }}>
        {/* Zgornja vrstica: desno poravnano — znesek + osvezi + dodaj */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#888" }}>
            <span>Neplačano: <strong style={{ color: "#dc2626" }}>{skupajNeplacano.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</strong></span>
            {!isMobile && <><span style={{ margin: "0 8px", color: "#ddd" }}>|</span><span>Skupaj: <strong>{skupajVse.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</strong></span></>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={onRefetch}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#aaa", display: "flex", fontSize: 18, padding: 4 }}
              title="Osveži"
            >↻</button>
            <button
              onClick={onDodaj}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >+ Dodaj opravilo</button>
          </div>
        </div>

        {/* Bulk akcije — vidne samo ko je kaj izbranih */}
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10, padding: "10px 12px", background: "#f0fdf4", borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>{selected.size} {selected.size === 1 ? "izbrano" : "izbranih"}</span>
            <button
              onClick={() => updatePlacano(Array.from(selected), true)}
              disabled={bulkLoading}
              style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >✓ Plačano</button>
            <button
              onClick={() => updatePlacano(Array.from(selected), false)}
              disabled={bulkLoading}
              style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#555", fontSize: 13, cursor: "pointer" }}
            >✗ Neplačano</button>
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
            Nalaganje opravil...
          </div>
        )}

        {error && (
          <div style={{ padding: 20, color: "#dc2626", fontSize: 13, background: "#fef2f2" }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && opravila.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
            Ni opravil za prikaz.
          </div>
        )}

        {!loading && opravila.length > 0 && (
          isMobile ? (
            // ---- MOBILNI PRIKAZ: kartice ----
            <div style={{ display: "flex", flexDirection: "column" }}>
              {opravila.map((o, i) => {
                const placano = getPlacano(o);
                const postavka = o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35;
                const znesek = (o.acf?.cas_ure || 0) * postavka;
                const isSelected = selected.has(o.id);

                return (
                  <div
                    key={o.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < opravila.length - 1 ? "1px solid #f0f0f0" : "none",
                      background: isSelected ? "#f0fdf4" : "#fff",
                    }}
                  >
                    {/* Zgornja vrstica: checkbox + datum + uredi */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div
                        onClick={() => toggleSelect(o.id)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: `2px solid ${isSelected ? BRAND : "#d1d5db"}`,
                          background: isSelected ? BRAND : "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: "#888" }}>{fmtDate(o.acf?.datum_opravila)}</span>
                      <span style={{ fontSize: 12, color: "#bbb" }}>·</span>
                      <span style={{ fontSize: 12, color: "#888" }}>{o.acf?.uporabnik || "—"}</span>
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => setEditOpravilo(o)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#bbb",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Naslov + opis */}
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 2 }}>
                      {o.acf?.naslov_opravila || stripHtml(o.title.rendered)}
                    </div>
                    {o.acf?.opis_opravila && (
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                        {o.acf.opis_opravila.slice(0, 80)}{o.acf.opis_opravila.length > 80 ? "..." : ""}
                      </div>
                    )}

                    {/* Spodnja vrstica: čas + znesek + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: "#666", background: "#f3f4f6", padding: "3px 8px", borderRadius: 6 }}>
                        {o.acf?.cas_ure} ur{o.acf?.custom_postavka ? ` · ${postavka} €/h` : ""}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
                        {znesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
                      </span>
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => updatePlacano([o.id], !placano)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 16,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 12,
                          background: placano ? "#dcfce7" : "#fee2e2",
                          color: placano ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {placano ? "✓ Plačano" : "Neplačano"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // ---- DESKTOP PRIKAZ: tabela ----
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ ...thStyle, width: 36 }}>
                    <div
                      onClick={toggleAll}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `2px solid ${selected.size === opravila.length ? BRAND : "#d1d5db"}`,
                        background: selected.size === opravila.length ? BRAND : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected.size === opravila.length && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                    </div>
                  </th>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Naslov</th>
                  <th style={thStyle}>Uporabnik</th>
                  <th style={thStyle}>Čas</th>
                  <th style={thStyle}>Znesek</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {opravila.map((o, i) => {
                  const placano = getPlacano(o);
                  const postavka = o.acf?.custom_postavka ? o.acf?.urna_postavka || 35 : 35;
                  const znesek = (o.acf?.cas_ure || 0) * postavka;
                  const isSelected = selected.has(o.id);

                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: i < opravila.length - 1 ? "1px solid #f7f7f7" : "none",
                        background: isSelected ? "#f0fdf4" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#fafafa"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div
                          onClick={() => toggleSelect(o.id)}
                          style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: `2px solid ${isSelected ? BRAND : "#d1d5db"}`,
                            background: isSelected ? BRAND : "#fff",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {isSelected && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#666", whiteSpace: "nowrap" }}>
                        {fmtDate(o.acf?.datum_opravila)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>
                          {o.acf?.naslov_opravila || stripHtml(o.title.rendered)}
                        </div>
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
                          style={{
                            padding: "4px 10px", borderRadius: 16, border: "none", cursor: "pointer",
                            fontWeight: 600, fontSize: 11,
                            background: placano ? "#dcfce7" : "#fee2e2",
                            color: placano ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {placano ? "✓ Plačano" : "Neplačano"}
                        </button>
                      </td>
                      <td style={{ padding: "8px 12px 8px 0" }}>
                        <button
                          onClick={() => setEditOpravilo(o)}
                          title="Uredi opravilo"
                          style={{
                            border: "none", background: "transparent", cursor: "pointer",
                            color: "#aaa", padding: 6, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#555"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#aaa"; }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// OPRAVILA SECTION
// ============================================================
export function OpravilaSection({ entityId, entityType }: { entityId: number; entityType: "narocnik" | "stranka" }) {
  const { opravila, loading, error, refetch } = useOpravila(entityId, entityType);
  const username = useCurrentUser();
  const [showModal, setShowModal] = useState(false);
  const [entityPost, setEntityPost] = useState<Post | null>(null);
  const allStranke = useAllPosts("stranka");
  const allNarocniki = useAllPosts("narocnik");

  useEffect(() => {
    async function fetchEntity() {
      if (!WP_URL || !entityId) return;

      try {
        const res = await fetch(
          `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${entityType}/${entityId}?_embed=1`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();
        setEntityPost(data);
      } catch {
        setEntityPost(null);
      }
    }

    fetchEntity();
  }, [entityId, entityType]);

  const entityList = useMemo(() => {
    if (!entityPost) return [];
    return [entityPost];
  }, [entityPost]);

  // Za modal: narocnik gre v narocniki prop, stranka pa v stranke prop

  const subtitle = entityType === "narocnik"
    ? "Zgodovina opravljenega dela za tega naročnika."
    : "Zgodovina opravljenega dela za to stranko.";

  return (
    <div style={{ marginTop: 20 }}>
    {showModal && (
    <DodajOpraviloModal
      onClose={() => setShowModal(false)}
      onSaved={refetch}
      stranke={entityList}
      defaultEntityId={entityId}
      entityType={entityType}
      username={username}
    />
    )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 4 }}>
          Opravila
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>
          {subtitle}
        </div>
      </div>

      <OpravilaTabela
        opravila={opravila}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onDodaj={() => setShowModal(true)}
        stranke={allStranke}
        narocniki={allNarocniki}
        username={username}
      />
    </div>
  );
}