"use client";
// components/admin/modals/StrankaModals.tsx
// Modali za dodajanje: Nova Stranka, Nov Naročnik, Nova Ponudba

import { useState, useRef } from "react";
import { BRAND } from "@/lib/constants";
import { ModalWrapper, FormField, BtnPrimary, BtnSecondary, ErrorMsg, fldStyle } from "../UI";
import type { Post } from "@/types/admin";

// ============================================================
// LOGO UPLOAD FIELD
// ============================================================
function LogoUploadField({ onUploaded }: { onUploaded: (id: number, url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload napaka");
      onUploaded(data.id, data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload napaka");
      setPreview(null);
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
          padding: "16px",
          cursor: "pointer",
          textAlign: "center",
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
                {uploading ? "Nalagam v WordPress..." : "✓ Logotip naložen"}
              </div>
              <div style={{ fontSize: 12, color: BRAND, marginTop: 2 }}>Klikni za zamenjavo</div>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", color: "#888", fontSize: 13 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📁</div>
            <div>Klikni za nalaganje logotipa</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
              JPG, PNG, SVG, WebP — max 5MB
            </div>
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ============================================================
// STRANKA SEARCH SELECT (za ponudbo)
// ============================================================
function StrankaSearchSelect({
  stranke,
  value,
  onChange,
}: {
  stranke: Post[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const filtered = stranke.filter((s) =>
    s.title.rendered.toLowerCase().includes(query.toLowerCase())
  );
  const selected = stranke.find((s) => String(s.id) === value);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(true);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ ...fldStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span style={{ color: selected ? "#111" : "#aaa" }}>
          {selected ? selected.title.rendered.replace(/<[^>]*>/g, "") : "Izberi stranko..."}
        </span>
        <span style={{ color: "#aaa", fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            zIndex: 9999,
            overflow: "hidden",
            maxHeight: 260,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f0" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Iskanje..."
              style={{ ...fldStyle, padding: "6px 10px", fontSize: 13 }}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>Ni rezultatov</div>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.id}
                  onMouseDown={() => {
                    onChange(String(s.id));
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    padding: "10px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#111",
                    borderBottom: "1px solid #f7f7f7",
                    background: String(s.id) === value ? `${BRAND}10` : "#fff",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = String(s.id) === value ? `${BRAND}10` : "#fff")
                  }
                  dangerouslySetInnerHTML={{ __html: s.title.rendered }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOVA STRANKA MODAL
// ============================================================
export function NovaStrankaModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    storitve: [] as string[],
    domena_url: "",
    potek_storitev: "",
    stanje_storitve: true,
    strosek: "",
    strosek_obracun: ["letno"],
    opombe: "",
  });
  const [logoId, setLogoId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleStoritev = (slug: string) => {
    set(
      "storitve",
      form.storitve.includes(slug)
        ? form.storitve.filter((s) => s !== slug)
        : [...form.storitve, slug]
    );
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Naziv stranke je obvezen");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/stranka/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logo_id: logoId }),
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

  const storitveOpcije = [
    { slug: "domena", label: "Domena" },
    { slug: "gostovanje", label: "Gostovanje" },
    { slug: "dom_gos", label: "Domena & gostovanje" },
    { slug: "vzdrzevanje", label: "Vzdrževanje" },
  ];

  const obracunOpcije = [
    { slug: "letno", label: "Letno" },
    { slug: "mesecno", label: "Mesečno" },
    { slug: "trimesecno", label: "Trimesečno" },
    { slug: "polletno", label: "Polletno" },
    { slug: "po_dogovoru", label: "Po dogovoru" },
  ];

  return (
    <ModalWrapper
      title="Nova stranka"
      onClose={onClose}
      footer={
        <>
          <BtnSecondary onClick={onClose}>Prekliči</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>
            {saving ? "Shranjujem..." : "Ustvari stranko"}
          </BtnPrimary>
        </>
      }
    >
      <FormField label="Naziv stranke" required>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="npr. Vetta d.o.o."
          style={fldStyle}
        />
      </FormField>
      <FormField label="Logotip">
        <LogoUploadField onUploaded={(id) => setLogoId(id)} />
      </FormField>
      <FormField label="Storitev">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {storitveOpcije.map((s) => (
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
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Domena URL">
          <input
            value={form.domena_url}
            onChange={(e) => set("domena_url", e.target.value)}
            placeholder="https://vetta.si"
            style={fldStyle}
          />
        </FormField>
        <FormField label="Potek storitev">
          <input
            type="date"
            value={
              form.potek_storitev
                ? `${form.potek_storitev.slice(0, 4)}-${form.potek_storitev.slice(4, 6)}-${form.potek_storitev.slice(6, 8)}`
                : ""
            }
            onChange={(e) => set("potek_storitev", e.target.value.replace(/-/g, ""))}
            style={fldStyle}
          />
        </FormField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Strošek (€)">
          <input
            type="number"
            value={form.strosek}
            onChange={(e) => set("strosek", e.target.value)}
            placeholder="150"
            style={fldStyle}
          />
        </FormField>
        <FormField label="Obračun">
          <select
            value={form.strosek_obracun[0]}
            onChange={(e) => set("strosek_obracun", [e.target.value])}
            style={fldStyle}
          >
            {obracunOpcije.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Stanje storitve">
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
      </FormField>
      <FormField label="Opombe">
        <textarea
          value={form.opombe}
          onChange={(e) => set("opombe", e.target.value)}
          rows={2}
          placeholder="Interne opombe..."
          style={{ ...fldStyle, resize: "vertical" }}
        />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}

// ============================================================
// NOV NAROČNIK MODAL
// ============================================================
export function NovNarocnikModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    kontaktna_oseba: "",
    email: "",
    telefon: "",
    podjetje: "",
    naslov: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Naziv naročnika je obvezen");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/narocnik/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      title="Nov naročnik"
      onClose={onClose}
      footer={
        <>
          <BtnSecondary onClick={onClose}>Prekliči</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>
            {saving ? "Shranjujem..." : "Ustvari naročnika"}
          </BtnPrimary>
        </>
      }
    >
      <FormField label="Naziv naročnika" required>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="npr. Janez Novak"
          style={fldStyle}
        />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Kontaktna oseba">
          <input
            value={form.kontaktna_oseba}
            onChange={(e) => set("kontaktna_oseba", e.target.value)}
            placeholder="Janez Novak"
            style={fldStyle}
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="janez@podjetje.si"
            style={fldStyle}
          />
        </FormField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Telefon">
          <input
            value={form.telefon}
            onChange={(e) => set("telefon", e.target.value)}
            placeholder="+386 41 123 456"
            style={fldStyle}
          />
        </FormField>
        <FormField label="Podjetje">
          <input
            value={form.podjetje}
            onChange={(e) => set("podjetje", e.target.value)}
            placeholder="Podjetje d.o.o."
            style={fldStyle}
          />
        </FormField>
      </div>
      <FormField label="Naslov">
        <input
          value={form.naslov}
          onChange={(e) => set("naslov", e.target.value)}
          placeholder="Ulica 1, 5000 Nova Gorica"
          style={fldStyle}
        />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}

// ============================================================
// NOVA PONUDBA MODAL
// ============================================================
export function NovaPonudbaModal({
  onClose,
  onSaved,
  stranke,
}: {
  onClose: () => void;
  onSaved: () => void;
  stranke: Post[];
}) {
  const [form, setForm] = useState({
    title: "",
    znesek: "",
    status_ponudbe: "v_obdelavi",
    veljavnost: "",
    stranka_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Naziv ponudbe je obvezen");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ponudba/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          stranka_id: form.stranka_id ? parseInt(form.stranka_id) : null,
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

  const statusOpcije = [
    { slug: "v_obdelavi", label: "V obdelavi" },
    { slug: "poslana", label: "Poslana" },
    { slug: "sprejeta", label: "Sprejeta" },
    { slug: "zavrnjena", label: "Zavrnjena" },
  ];

  return (
    <ModalWrapper
      title="Nova ponudba"
      onClose={onClose}
      footer={
        <>
          <BtnSecondary onClick={onClose}>Prekliči</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>
            {saving ? "Shranjujem..." : "Ustvari ponudbo"}
          </BtnPrimary>
        </>
      }
    >
      <FormField label="Naziv ponudbe" required>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="npr. Spletna stran 2025"
          style={fldStyle}
        />
      </FormField>
      <FormField label="Stranka">
        <StrankaSearchSelect
          stranke={stranke}
          value={form.stranka_id}
          onChange={(v) => set("stranka_id", v)}
        />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Znesek (€)">
          <input
            type="number"
            value={form.znesek}
            onChange={(e) => set("znesek", e.target.value)}
            placeholder="1200"
            style={fldStyle}
          />
        </FormField>
        <FormField label="Status">
          <select
            value={form.status_ponudbe}
            onChange={(e) => set("status_ponudbe", e.target.value)}
            style={fldStyle}
          >
            {statusOpcije.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Veljavnost do">
        <input
          type="date"
          value={form.veljavnost}
          onChange={(e) => set("veljavnost", e.target.value)}
          style={fldStyle}
        />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}
