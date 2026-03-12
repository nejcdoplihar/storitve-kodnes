"use client";
import { useState, useEffect } from "react";

const BRAND = "#00a4a7";

const CAS_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5);

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

function fmtDate(d: string): string {
  if (!d || d.length !== 8) return d || "—";
  return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toLocaleDateString("sl-SI");
}

type Opravilo = {
  id: number;
  title: { rendered: string };
  acf: {
    datum_opravila: string;
    uporabnik: string;
    naslov_opravila: string;
    opis_opravila: string;
    cas_ure: number;
    custom_postavka: boolean;
    urna_postavka: number;
    stranka_rel: Array<{ ID: number; post_title: string }>;
    placano: boolean;
  };
};

const IcoPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoClose = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCheck = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;

function OpravilaSection({ strankaId }: { strankaId: number }) {
  const [opravila, setOpravila] = useState<Opravilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [localPlacano, setLocalPlacano] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");

  const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => setUsername(d.username || ""));
  }, []);

  const fetchOpravila = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo?per_page=100&acf_format=standard`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: Opravilo[] = await res.json();
      const filtered = data.filter(o => {
        const rel = o.acf?.stranka_rel;
        if (!Array.isArray(rel)) return false;
        return rel.some(r => r.ID === strankaId);
      });
      filtered.sort((a, b) => (b.acf?.datum_opravila || "").localeCompare(a.acf?.datum_opravila || ""));
      setOpravila(filtered);
    } catch { /* tiho */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOpravila(); }, [strankaId]);

  const getPlacano = (o: Opravilo) => localPlacano[o.id] !== undefined ? localPlacano[o.id] : o.acf?.placano;

  const updatePlacano = async (ids: number[], placano: boolean) => {
    await fetch("/api/opravilo/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, placano }),
    });
    const updates: Record<number, boolean> = {};
    ids.forEach(id => updates[id] = placano);
    setLocalPlacano(prev => ({ ...prev, ...updates }));
    setSelected(new Set());
  };

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === opravila.length ? new Set() : new Set(opravila.map(o => o.id)));

  const skupajNeplačano = opravila.filter(o => !getPlacano(o))
    .reduce((s, o) => s + (o.acf?.cas_ure || 0) * (o.acf?.custom_postavka ? (o.acf?.urna_postavka || 35) : 35), 0);

  const thS: React.CSSProperties = { padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#999", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" };

  return (
    <>
      {showModal && (
        <DodajOpraviloModal
          onClose={() => setShowModal(false)}
          onSaved={fetchOpravila}
          strankaId={strankaId}
          username={username}
        />
      )}

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20 }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>Opravila</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {skupajNeplačano > 0 && (
              <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                Neplačano: {skupajNeplačano.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
              </span>
            )}
            {selected.size > 0 && (
              <>
                <button onClick={() => updatePlacano(Array.from(selected), true)}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  ✓ Plačano
                </button>
                <button onClick={() => updatePlacano(Array.from(selected), false)}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#555", fontSize: 12, cursor: "pointer" }}>
                  Neplačano
                </button>
              </>
            )}
            <button onClick={() => setShowModal(true)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <IcoPlus /> Dodaj
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && <div style={{ padding: 32, textAlign: "center", color: "#aaa", fontSize: 13 }}>Nalaganje...</div>}
        {!loading && opravila.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#aaa", fontSize: 13 }}>Ni opravil za to stranko.</div>
        )}
        {!loading && opravila.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ ...thS, width: 36 }}>
                  <div onClick={toggleAll} style={{ width: 15, height: 15, borderRadius: 3, border: `2px solid ${selected.size === opravila.length ? BRAND : "#d1d5db"}`, background: selected.size === opravila.length ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected.size === opravila.length && <IcoCheck />}
                  </div>
                </th>
                <th style={thS}>Datum</th>
                <th style={thS}>Naslov</th>
                <th style={thS}>Uporabnik</th>
                <th style={thS}>Čas</th>
                <th style={thS}>Znesek</th>
                <th style={thS}>Status</th>
              </tr>
            </thead>
            <tbody>
              {opravila.map((o, i) => {
                const placano = getPlacano(o);
                const postavka = o.acf?.custom_postavka ? (o.acf?.urna_postavka || 35) : 35;
                const znesek = (o.acf?.cas_ure || 0) * postavka;
                const isSel = selected.has(o.id);
                return (
                  <tr key={o.id} style={{ borderBottom: i < opravila.length - 1 ? "1px solid #f7f7f7" : "none", background: isSel ? "#f0fdf4" : "transparent" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div onClick={() => toggleSelect(o.id)} style={{ width: 15, height: 15, borderRadius: 3, border: `2px solid ${isSel ? BRAND : "#d1d5db"}`, background: isSel ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isSel && <IcoCheck />}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>{fmtDate(o.acf?.datum_opravila)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>{o.acf?.naslov_opravila || o.title.rendered}</div>
                      {o.acf?.opis_opravila && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{o.acf.opis_opravila.slice(0, 70)}{o.acf.opis_opravila.length > 70 ? "…" : ""}</div>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#666" }}>{o.acf?.uporabnik || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#333", whiteSpace: "nowrap" }}>
                      {o.acf?.cas_ure} ur
                      {o.acf?.custom_postavka && <div style={{ fontSize: 10, color: "#bbb" }}>{postavka} €/h</div>}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{znesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => updatePlacano([o.id], !placano)}
                        style={{ padding: "3px 9px", borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11,
                          background: placano ? "#dcfce7" : "#fee2e2", color: placano ? "#16a34a" : "#dc2626" }}>
                        {placano ? "✓ Plačano" : "Neplačano"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ---- Dodaj opravilo modal ----
function DodajOpraviloModal({ onClose, onSaved, strankaId, username }: {
  onClose: () => void;
  onSaved: () => void;
  strankaId: number;
  username: string;
}) {
  const [form, setForm] = useState({
    datum_opravila: todayYMD(),
    naslov_opravila: "",
    opis_opravila: "",
    cas_ure: "0.5",
    custom_postavka: false,
    urna_postavka: "35",
    placano: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.naslov_opravila.trim()) { setError("Naslov je obvezen"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/opravilo/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, uporabnik: username, stranka_id: strankaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); setSaving(false); }
  };

  const inputS: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
  const labelS: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Dodaj opravilo</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", display: "flex" }}><IcoClose /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelS}>Datum opravila</label>
              <input type="date" value={`${form.datum_opravila.slice(0,4)}-${form.datum_opravila.slice(4,6)}-${form.datum_opravila.slice(6,8)}`}
                onChange={e => set("datum_opravila", e.target.value.replace(/-/g, ""))} style={inputS} />
            </div>
            <div>
              <label style={labelS}>Uporabnik</label>
              <input value={username} disabled style={{ ...inputS, background: "#f8f9fb", color: "#888" }} />
            </div>
          </div>
          <div>
            <label style={labelS}>Naslov opravila *</label>
            <input value={form.naslov_opravila} onChange={e => set("naslov_opravila", e.target.value)} placeholder="npr. Popravek kontaktnega obrazca" style={inputS} />
          </div>
          <div>
            <label style={labelS}>Opis</label>
            <textarea value={form.opis_opravila} onChange={e => set("opis_opravila", e.target.value)} rows={3}
              placeholder="Podrobnejši opis..." style={{ ...inputS, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelS}>Porabljen čas</label>
              <select value={form.cas_ure} onChange={e => set("cas_ure", e.target.value)} style={inputS}>
                {CAS_OPTIONS.map(v => <option key={v} value={v}>{v} {v === 1 ? "ura" : v < 5 ? "ure" : "ur"}</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Urna postavka</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" value={form.custom_postavka ? form.urna_postavka : "35"} disabled={!form.custom_postavka}
                  onChange={e => set("urna_postavka", e.target.value)}
                  style={{ ...inputS, background: form.custom_postavka ? "#fff" : "#f8f9fb" }} />
                <span style={{ fontSize: 13, color: "#888" }}>€/h</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div onClick={() => set("custom_postavka", !form.custom_postavka)}
              style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${form.custom_postavka ? BRAND : "#d1d5db"}`, background: form.custom_postavka ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {form.custom_postavka && <IcoCheck />}
            </div>
            <label onClick={() => set("custom_postavka", !form.custom_postavka)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>Drugačna urna postavka</label>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#888" }}>Skupaj:</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
              {(parseFloat(form.cas_ure) * (form.custom_postavka ? parseFloat(form.urna_postavka) || 0 : 35)).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div onClick={() => set("placano", !form.placano)}
              style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${form.placano ? "#16a34a" : "#d1d5db"}`, background: form.placano ? "#16a34a" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {form.placano && <IcoCheck />}
            </div>
            <label onClick={() => set("placano", !form.placano)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>Že plačano</label>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>⚠️ {error}</div>}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555" }}>Prekliči</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: saving ? "#99d6d8" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Shranjujem..." : "Shrani"}
          </button>
        </div>
      </div>
    </div>
  );
}



// ============================================================
// UREDI STRANKO MODAL + BUTTON
// ============================================================

type StrankaACF = {
  storitve?: string[];
  domena_url?: string;
  potek_storitev?: string;
  stanje_storitve?: boolean;
  strosek?: number;
  strosek_obracun?: string[];
  opombe?: string;
};

const fldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
  fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: "inherit",
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

function UrediStrankoModal({ strankaId, acf, onClose, onSaved }: {
  strankaId: number;
  acf: StrankaACF;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    storitve: acf.storitve || [],
    domena_url: acf.domena_url || "",
    potek_storitev: acf.potek_storitev || "",
    stanje_storitve: acf.stanje_storitve !== false,
    strosek: acf.strosek ? String(acf.strosek) : "",
    strosek_obracun: acf.strosek_obracun || ["letno"],
    opombe: acf.opombe || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleStoritev = (slug: string) => {
    set("storitve", form.storitve.includes(slug)
      ? form.storitve.filter((s: string) => s !== slug)
      : [...form.storitve, slug]);
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/stranka/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: strankaId,
          fields: {
            ...form,
            strosek: form.strosek ? parseFloat(form.strosek) : 0,
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Uredi stranko</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", display: "flex", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Storitve */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 8 }}>Storitev</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {storitveOpcije.map(s => (
                <div key={s.slug} onClick={() => toggleStoritev(s.slug)}
                  style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500, border: `1.5px solid ${form.storitve.includes(s.slug) ? BRAND : "#e5e7eb"}`, background: form.storitve.includes(s.slug) ? `${BRAND}12` : "#fff", color: form.storitve.includes(s.slug) ? BRAND : "#555" }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Domena + Potek */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>Domena URL</label>
              <input value={form.domena_url} onChange={e => set("domena_url", e.target.value)} placeholder="https://vetta.si" style={fldStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>Potek storitev</label>
              <input type="date"
                value={form.potek_storitev ? `${form.potek_storitev.slice(0,4)}-${form.potek_storitev.slice(4,6)}-${form.potek_storitev.slice(6,8)}` : ""}
                onChange={e => set("potek_storitev", e.target.value.replace(/-/g, ""))}
                style={fldStyle} />
            </div>
          </div>

          {/* Strosek + Obracun */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>Strošek (€)</label>
              <input type="number" value={form.strosek} onChange={e => set("strosek", e.target.value)} placeholder="150" style={fldStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>Obračun</label>
              <select value={form.strosek_obracun[0] || "letno"} onChange={e => set("strosek_obracun", [e.target.value])} style={fldStyle}>
                {obracunOpcije.map(o => <option key={o.slug} value={o.slug}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Stanje */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 8 }}>Stanje storitve</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div onClick={() => set("stanje_storitve", !form.stanje_storitve)}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.stanje_storitve ? BRAND : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: form.stanje_storitve ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, color: "#555" }}>{form.stanje_storitve ? "Aktivna" : "Neaktivna"}</span>
            </div>
          </div>

          {/* Opombe */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>Opombe</label>
            <textarea value={form.opombe} onChange={e => set("opombe", e.target.value)} rows={2}
              placeholder="Interne opombe..." style={{ ...fldStyle, resize: "vertical" }} />
          </div>

          {error && <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>⚠️ {error}</div>}
          {success && <div style={{ color: "#16a34a", fontSize: 13, padding: "8px 12px", background: "#dcfce7", borderRadius: 8 }}>✓ Shranjeno!</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555" }}>Prekliči</button>
          <button onClick={handleSave} disabled={saving || success}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: success ? "#16a34a" : saving ? "#99d6d8" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: (saving || success) ? "default" : "pointer" }}>
            {success ? "✓ Shranjeno" : saving ? "Shranjujem..." : "Shrani spremembe"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UrediStrankoButton({ strankaId, acf }: { strankaId: number; acf: StrankaACF }) {
  const [open, setOpen] = useState(false);
  const [localAcf, setLocalAcf] = useState(acf);

  return (
    <>
      {open && (
        <UrediStrankoModal
          strankaId={strankaId}
          acf={localAcf}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setLocalAcf(f => ({ ...f })); // trigger re-render
            setOpen(false);
          }}
        />
      )}
      <button onClick={() => setOpen(true)}
        style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Uredi
      </button>
    </>
  );
}

export { OpravilaSection };
