"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_ADMIN_URL = `${WP_URL.replace(/\/$/, "")}/wp-admin`;

// ============================================================
// TYPES
// ============================================================
type Post = {
  id: number;
  title: { rendered: string };
  date: string;
  status: string;
  slug: string;
  acf?: Record<string, unknown>;
};

type StrankaACF = {
  stanje_storitve: boolean;
  storitve: string | string[];
  domena_url: string;
  potek_storitev: string; // "20260311" YYYYMMDD
  strosek: number;
  strosek_obracun: string[];
  opombe: string;
};

type Stranka = Post & {
  acf: StrankaACF;
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
};

type ActiveView = "dashboard" | "narocnik" | "ponudba" | "stranka";

// ============================================================
// STORITVE LABELS
// ============================================================
const STORITVE_LABELS: Record<string, string> = {
  domena: "Domena",
  gostovanje: "Gostovanje",
  dom_gos: "Domena & gostovanje",
  vzdrzevanje: "Vzdrževanje",
};

function getStoritveLabel(s: string | string[]): string {
  if (!s || (Array.isArray(s) && s.length === 0)) return "—";
  if (Array.isArray(s)) return s.map(v => STORITVE_LABELS[v] || v).join(", ");
  return STORITVE_LABELS[s] || s;
}

// ============================================================
// HELPERS — ACF datum "20260311" → Date
// ============================================================
function parseACFDate(d: string): Date | null {
  if (!d || d.length !== 8) return null;
  return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
}

function formatACFDate(d: string): string {
  const dt = parseACFDate(d);
  if (!dt) return "—";
  return dt.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDaysLeft(d: string): number {
  const dt = parseACFDate(d);
  if (!dt) return 999;
  return Math.floor((dt.getTime() - Date.now()) / 86400000);
}

function isThisMonth(d: string): boolean {
  const dt = parseACFDate(d);
  if (!dt) return false;
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
}

const MESECI = ["januar", "februar", "marec", "april", "maj", "junij", "julij", "avgust", "september", "oktober", "november", "december"];

// ============================================================
// ICONS
// ============================================================
const icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  file: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  building: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  trend_up: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  wp: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 1.5c1.953 0 3.754.633 5.217 1.686L4.186 17.217A8.5 8.5 0 0 1 3.5 12c0-4.687 3.813-8.5 8.5-8.5zm0 17c-1.953 0-3.754-.633-5.217-1.686L19.814 6.783A8.5 8.5 0 0 1 20.5 12c0 4.687-3.813 8.5-8.5 8.5z"/></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ============================================================
// HELPERS (originalne)
// ============================================================
function formatDate(date: string) {
  try { return new Date(date).toLocaleDateString("sl-SI"); } catch { return date; }
}

function getAcfPreview(acf?: Record<string, unknown>) {
  if (!acf) return [];
  return Object.entries(acf)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, 3);
}

// ============================================================
// HOOKS
// ============================================================
function useWPData(cptSlug: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!WP_URL) { setError("NEXT_PUBLIC_WORDPRESS_URL ni nastavljen."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${cptSlug}?per_page=100&_embed=1`, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka pri nalaganju podatkov."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [cptSlug]);
  return { posts, loading, error, refetch: fetchData };
}

function useStranke() {
  const [stranke, setStranke] = useState<Stranka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!WP_URL) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/stranka?per_page=100&_embed=true&status=publish`, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setStranke(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  return { stranke, loading, error, refetch: fetchData };
}

function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <button onClick={handleLogout}
      style={{
        fontSize: 13, fontWeight: 500, cursor: "pointer",
        padding: "6px 14px", borderRadius: 8,
        border: "1px solid #334155", background: "transparent",
        color: "#94a3b8",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
    >
      Odjava
    </button>
  );
}

// ============================================================
// COMPONENTS (originalni)
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const isPublished = status === "publish";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: isPublished ? "#dcfce7" : "#fef9c3", color: isPublished ? "#15803d" : "#854d0e" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isPublished ? "#22c55e" : "#eab308" }} />
      {isPublished ? "Objavljeno" : "Osnutek"}
    </span>
  );
}

function StatCard({ label, value, loading, color, icon }: { label: string; value: number; loading: boolean; color: string; icon: ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "#888", fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111", lineHeight: 1 }}>
            {loading ? <span style={{ display: "inline-block", width: 40, height: 32, background: "#f0f0f0", borderRadius: 6 }} /> : value}
          </div>
          <div style={{ fontSize: 12, color: "#22c55e", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>{icons.trend_up} iz WordPressa</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}

function DataTable({ cptSlug }: { cptSlug: string }) {
  const { posts, loading, error, refetch } = useWPData(cptSlug);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => posts.filter((p) => p.title.rendered.toLowerCase().includes(search.toLowerCase())), [posts, search]);

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ color: "#aaa" }}>{icons.search}</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Iskanje..." style={{ border: "none", outline: "none", fontSize: 14, color: "#333", background: "transparent", flex: 1 }} />
        <span style={{ fontSize: 12, color: "#aaa" }}>{filtered.length} zapisov</span>
        <button onClick={refetch} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center" }} title="Osveži">{icons.refresh}</button>
      </div>
      {error && <div style={{ padding: 20, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠️ Napaka: {error}</div>}
      {loading && <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje iz WordPressa...</div>}
      {!loading && !error && (
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
                    <a href={`/cpt/${cptSlug}/${post.slug}`} style={{ fontSize: 13, color: "#3b82f6", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>Odpri {icons.arrow}</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>{search ? `Ni rezultatov za "${search}"` : "Ni zapisov"}</div>
      )}
    </div>
  );
}

// ============================================================
// STRANKE TA MESEC
// ============================================================
function PotekBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#dc2626" }}>POTEKLO</span>;
  if (daysLeft <= 5) return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#d97706" }}>KMALU POTEČE</span>;
  return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#16a34a" }}>VELJAVNO</span>;
}

function PodaljsajButton({ strankaId, currentDate, onSuccess }: { strankaId: number; currentDate: string; onSuccess: (newDate: string) => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handlePodaljsaj = async () => {
    if (!confirm(`Podaljšati storitev za 1 leto?\n${formatACFDate(currentDate)} → ${formatACFDate(String(Number(currentDate.slice(0, 4)) + 1) + currentDate.slice(4))}`)) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/podaljsaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: strankaId, currentDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      setStatus("done");
      onSuccess(data.newDate);
      // Reset po 3 sekundah
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (status === "done") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
      {icons.check} Podaljšano!
    </span>
  );

  if (status === "error") return (
    <span style={{ fontSize: 12, color: "#dc2626" }}>⚠️ Napaka</span>
  );

  return (
    <button
      onClick={handlePodaljsaj}
      disabled={status === "loading"}
      style={{
        fontSize: 12, fontWeight: 600, cursor: status === "loading" ? "default" : "pointer",
        padding: "5px 12px", borderRadius: 6, border: "none",
        background: status === "loading" ? "#bfdbfe" : "#3b82f6",
        color: "#fff", whiteSpace: "nowrap", transition: "background 0.15s",
      }}
    >
      {status === "loading" ? "..." : "Podaljšaj"}
    </button>
  );
}

function StrankeTekoMesec({ stranke: initialStranke, loading }: { stranke: Stranka[]; loading: boolean }) {
  const now = new Date();
  const mesec = MESECI[now.getMonth()];
  const leto = now.getFullYear();

  // Lokalno stanje za posodobitev datumov brez refetch
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const handleDateUpdate = (id: number, newDate: string) => {
    setOverrides(prev => ({ ...prev, [id]: newDate }));
  };

  const thisMonth = useMemo(() =>
    initialStranke
      .map(s => ({ ...s, acf: { ...s.acf, potek_storitev: overrides[s.id] || s.acf?.potek_storitev } }))
      .filter(s => s.acf?.stanje_storitve !== false && isThisMonth(s.acf?.potek_storitev))
      .sort((a, b) => {
        const da = parseACFDate(a.acf?.potek_storitev)?.getTime() || 0;
        const db = parseACFDate(b.acf?.potek_storitev)?.getTime() || 0;
        return da - db;
      }),
    [initialStranke, overrides]
  );

  const skupajBrezDdv = thisMonth.reduce((sum, s) => sum + (Number(s.acf?.strosek) || 0), 0);
  const skupajZDdv = skupajBrezDdv * 1.22;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111", display: "flex", alignItems: "center", gap: 8 }}>
            {icons.calendar} Stranke — {mesec} {leto}
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>Stranke katerim poteče storitev ta mesec</div>
        </div>
        {!loading && thisMonth.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#888" }}>Skupaj</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{skupajBrezDdv.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{skupajZDdv.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV</div>
          </div>
        )}
      </div>

      {loading && <div style={{ padding: 32, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje strank...</div>}

      {!loading && thisMonth.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#aaa", fontSize: 14 }}>
          Ni aktivnih strank s potekom storitev v {mesec}u {leto}.
        </div>
      )}

      {!loading && thisMonth.length > 0 && (
        <>
          {thisMonth.map((stranka, i) => {
            const logo = stranka._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
            const currentDate = overrides[stranka.id] || stranka.acf?.potek_storitev;
            const daysLeft = getDaysLeft(currentDate);

            return (
              <div key={stranka.id}
                style={{ padding: "14px 24px", borderBottom: i < thisMonth.length - 1 ? "1px solid #f7f7f7" : "none", display: "flex", alignItems: "center", gap: 16 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafafe")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Logo */}
                <div style={{ width: 52, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {logo
                    ? <img src={logo} alt={stranka.title.rendered} style={{ maxWidth: 52, maxHeight: 36, objectFit: "contain", borderRadius: 4 }} />
                    : <div style={{ width: 52, height: 36, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏢</div>
                  }
                </div>

                {/* Ime + domena */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{stranka.title.rendered}</div>
                  {stranka.acf?.domena_url && (
                    <a href={stranka.acf.domena_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                      {icons.link} {stranka.acf.domena_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>

                {/* Storitev */}
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 1 }}>Storitev</div>
                  <div style={{ fontSize: 13, color: "#555" }}>{getStoritveLabel(stranka.acf?.storitve)}</div>
                </div>

                {/* Datum poteka */}
                <div style={{ minWidth: 100 }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 1 }}>Potek</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>{formatACFDate(currentDate)}</div>
                  <div style={{ fontSize: 11, color: daysLeft <= 5 ? "#f59e0b" : "#aaa" }}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} dni nazaj` : daysLeft === 0 ? "danes" : `čez ${daysLeft} dni`}
                  </div>
                </div>

                {/* Badge */}
                <div style={{ minWidth: 100 }}>
                  <PotekBadge daysLeft={daysLeft} />
                </div>

                {/* Strošek */}
                <div style={{ minWidth: 80, textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
                    {stranka.acf?.strosek ? `${stranka.acf.strosek} €` : "—"}
                  </div>
                  {stranka.acf?.strosek_obracun?.length > 0 && (
                    <div style={{ fontSize: 11, color: "#aaa" }}>/ {stranka.acf.strosek_obracun.join(", ")}</div>
                  )}
                </div>

                {/* Gumbi */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <PodaljsajButton
                    strankaId={stranka.id}
                    currentDate={currentDate}
                    onSuccess={(newDate) => handleDateUpdate(stranka.id, newDate)}
                  />
                  <a href={`${WP_ADMIN_URL}/post.php?post=${stranka.id}&action=edit`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "#6b7280", textDecoration: "none", padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 6, whiteSpace: "nowrap" }}>
                    Uredi ↗
                  </a>
                </div>
              </div>
            );
          })}

          {/* Skupaj */}
          <div style={{ padding: "14px 24px", background: "#f8fafc", borderTop: "2px solid #e2e8f0", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>Skupni znesek:</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{skupajBrezDdv.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</span>
            <span style={{ fontSize: 13, color: "#888" }}>{skupajZDdv.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD OVERVIEW
// ============================================================
function DashboardOverview() {
  const narocniki = useWPData("narocnik");
  const ponudbe = useWPData("ponudba");
  const stranke = useWPData("stranka");
  const { stranke: strankeDetailed, loading: strankeLoading } = useStranke();

  const anyLoading = narocniki.loading || ponudbe.loading || stranke.loading;

  const recentAll = useMemo(() => {
    return [
      ...narocniki.posts.map((p) => ({ ...p, cptType: "Naročnik", cptSlug: "narocnik", color: "#3b82f6" })),
      ...ponudbe.posts.map((p) => ({ ...p, cptType: "Ponudba", cptSlug: "ponudba", color: "#10b981" })),
      ...stranke.posts.map((p) => ({ ...p, cptType: "Stranka", cptSlug: "stranka", color: "#f59e0b" })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [narocniki.posts, ponudbe.posts, stranke.posts]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Naročniki" value={narocniki.posts.length} loading={narocniki.loading} color="#3b82f6" icon={icons.users} />
        <StatCard label="Ponudbe" value={ponudbe.posts.length} loading={ponudbe.loading} color="#10b981" icon={icons.file} />
        <StatCard label="Stranke" value={stranke.posts.length} loading={stranke.loading} color="#f59e0b" icon={icons.building} />
      </div>

      <StrankeTekoMesec stranke={strankeDetailed} loading={strankeLoading} />

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f5f5f5" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Nedavna aktivnost</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>Zadnje dodane vsebine iz WordPressa</div>
        </div>
        {anyLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Naslov", "Tip", "Datum", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAll.map((item, i) => (
                <tr key={`${item.cptType}-${item.id}`}
                  style={{ borderBottom: i < recentAll.length - 1 ? "1px solid #f7f7f7" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "13px 24px", fontWeight: 600, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
                  <td style={{ padding: "13px 24px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: item.color + "18", color: item.color }}>{item.cptType}</span>
                  </td>
                  <td style={{ padding: "13px 24px", fontSize: 13, color: "#666" }}>{formatDate(item.date)}</td>
                  <td style={{ padding: "13px 24px" }}><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: "dashboard" as ActiveView, label: "Pregled", icon: icons.dashboard },
    { id: "narocnik" as ActiveView, label: "Naročniki", icon: icons.users },
    { id: "ponudba" as ActiveView, label: "Ponudbe", icon: icons.file },
    { id: "stranka" as ActiveView, label: "Stranke", icon: icons.building },
  ];

  const titles: Record<ActiveView, string> = {
    dashboard: "Pregled",
    narocnik: "Naročniki",
    ponudba: "Ponudbe",
    stranka: "Stranke",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <aside style={{ width: sidebarOpen ? 240 : 68, minWidth: sidebarOpen ? 240 : 68, background: "#0f172a", display: "flex", flexDirection: "column", transition: "width 0.2s ease, min-width 0.2s ease", overflow: "hidden" }}>
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{icons.wp}</div>
          {sidebarOpen && (
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>WP Dashboard</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{WP_URL || "WordPress povezava ni nastavljena"}</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "#1e40af" : "transparent", color: active ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: active ? 600 : 400, marginBottom: 2, transition: "all 0.15s", textAlign: "left" }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid #1e293b" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#475569" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
          >
            {icons.menu}
            {sidebarOpen && <span style={{ fontSize: 13 }}>Skrči</span>}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 13, color: "#aaa" }}>WordPress CMS / </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{titles[activeView]}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {WP_URL && (
              <a href={WP_ADMIN_URL} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}>
                WP Admin ↗
              </a>
            )}
            <LogoutButton />
          </div>
        </header>

        <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: 0 }}>{titles[activeView]}</h1>
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              {activeView === "dashboard" ? "Pregled vseh vsebin iz WordPress CMS" : `Vsi zapisi tipa "${titles[activeView]}" iz WordPressa`}
            </p>
          </div>
          {activeView === "dashboard" ? <DashboardOverview /> : <DataTable cptSlug={activeView} />}
        </div>
      </main>
    </div>
  );
}
