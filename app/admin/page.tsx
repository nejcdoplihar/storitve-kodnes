"use client";

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";

const BRAND = "#00a4a7";
const INACTIVE_MS = 5 * 60 * 1000; // 5 minut neaktivnosti
const WARNING_S = 45;               // 45 sekund odštevalnik

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_ADMIN_URL = `${WP_URL.replace(/\/$/, "")}/wp-admin`;

// ============================================================
// SESSION TIMEOUT
// ============================================================
function useSessionTimeout() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);

    timerRef.current = setTimeout(() => {
      setCountdown(WARNING_S);
      let secs = WARNING_S;
      countdownRef.current = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          logout();
        }
      }, 1000);
    }, INACTIVE_MS);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  return { countdown, resetTimer, logout };
}

function SessionWarning({ countdown, onStay, onLogout }: { countdown: number; onStay: () => void; onLogout: () => void }) {
  const urgent = countdown <= 10;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: urgent ? "#fee2e2" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
          ⏱️
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>Seja bo kmalu potekla</h2>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px", lineHeight: 1.5 }}>
          Zaradi neaktivnosti boš avtomatsko odjavljen.
        </p>
        <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px", background: urgent ? "#fee2e2" : "#f0fdf4", border: `4px solid ${urgent ? "#dc2626" : BRAND}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: urgent ? "#dc2626" : BRAND }}>{countdown}</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onLogout}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Odjava
          </button>
          <button onClick={onStay}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Ostani prijavljen
          </button>
        </div>
      </div>
    </div>
  );
}

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

type ActiveView =
  | "dashboard"
  | "narocnik"
  | "ponudba"
  | "stranka"
  | "statistika"
  | "finance"
  | "opravila"
  | "profil";

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
  chart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  euro: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10h12M4 14h12M19.5 6.5A7.5 7.5 0 1 0 19.5 17.5"/></svg>,
  task: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
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
function useWPData(cptSlug: string, page = 1, perPage = 20) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    if (!WP_URL) {
      setError("NEXT_PUBLIC_WORDPRESS_URL ni nastavljen.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${cptSlug}?per_page=${perPage}&page=${page}&_embed=1`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data = await res.json();
      const wpTotal = Number(res.headers.get("X-WP-Total") || 0);
      const wpTotalPages = Number(res.headers.get("X-WP-TotalPages") || 1);

      setPosts(Array.isArray(data) ? data : []);
      setTotal(wpTotal);
      setTotalPages(wpTotalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka pri nalaganju podatkov.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cptSlug, page, perPage]);

  return { posts, loading, error, total, totalPages, refetch: fetchData };
}

function useStranke() {
  const [stranke, setStranke] = useState<Stranka[]>([]);
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
      const baseUrl = `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/stranka`;
      let currentPage = 1;
      let totalPages = 1;
      let allStranke: Stranka[] = [];

      do {
        const res = await fetch(
          `${baseUrl}?per_page=100&page=${currentPage}&_embed=true&status=publish`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);

        if (Array.isArray(data)) {
          allStranke = [...allStranke, ...data];
        }

        currentPage++;
      } while (currentPage <= totalPages);

      setStranke(allStranke);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

function DataTable({ cptSlug, onAdd }: { cptSlug: string; onAdd?: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; naziv: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { posts, loading, error, total, totalPages, refetch } = useWPData(cptSlug, page, perPage);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/cpt/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, cptSlug }),
      });
      if (res.ok) { setDeleteTarget(null); refetch(); }
      else { const d = await res.json(); alert(d.error || "Napaka pri brisanju"); }
    } finally { setDeleting(false); }
  };

  const DELETABLE = ["narocnik", "stranka", "ponudba"];

  useEffect(() => {
    setPage(1);
  }, [cptSlug, search]);

  const filtered = useMemo(() => {
    return posts.filter((p) =>
      p.title.rendered.toLowerCase().includes(search.toLowerCase())
    );
  }, [posts, search]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(page * perPage, total);

  return (
    <>
    {deleteTarget && (
      <ConfirmDeleteDialog
        naziv={deleteTarget.naziv}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    )}
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid #f5f5f5",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ color: "#aaa" }}>{icons.search}</div>

        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Iskanje..."
          style={{
            border: "none",
            outline: "none",
            fontSize: 14,
            color: "#333",
            background: "transparent",
            flex: 1,
          }}
        />

        <span style={{ fontSize: 12, color: "#aaa" }}>
          {search.trim()
            ? `${filtered.length} rezultatov na tej strani`
            : `Prikaz ${from}–${to} od ${total} zapisov`}
        </span>

        <button
          onClick={refetch}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#aaa",
            display: "flex",
            alignItems: "center",
          }}
          title="Osveži"
        >
          {icons.refresh}
        </button>
        {onAdd && (
          <button onClick={onAdd}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            + Dodaj
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: 20, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          ⚠️ Napaka: {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
          Nalaganje iz WordPressa...
        </div>
      )}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["Naslov", "Datum", "Status", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "11px 20px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#888",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((post, i) => {
              const acfPreview = getAcfPreview(post.acf);

              return (
                <tr
                  key={post.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid #f7f7f7" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 14, color: "#111" }}
                      dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                    />
                    {acfPreview.length > 0 && (
                      <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                        {acfPreview.map(([key, val]) => (
                          <span key={key} style={{ fontSize: 11, color: "#888" }}>
                            <span style={{ color: "#bbb" }}>{key}: </span>
                            {String(val)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#666" }}>
                    {formatDate(post.date)}
                  </td>

                  <td style={{ padding: "14px 20px" }}>
                    <StatusBadge status={post.status} />
                  </td>

                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <a
                        href={`/cpt/${cptSlug}/${post.slug}`}
                        style={{ fontSize: 13, color: "#00a4a7", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}
                      >
                        Odpri {icons.arrow}
                      </a>
                      {DELETABLE.includes(cptSlug) && (
                        <button
                          onClick={() => setDeleteTarget({ id: post.id, naziv: post.title.rendered.replace(/<[^>]*>/g, "") })}
                          title="Premakni v koš"
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#d1d5db", padding: 4, display: "flex", borderRadius: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#d1d5db")}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
          {search ? `Ni rezultatov za "${search}"` : "Ni zapisov"}
        </div>
      )}

      {!loading && !error && !search.trim() && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderTop: "1px solid #f0f0f0",
            background: "#fff",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: page === 1 ? "#f9fafb" : "#fff",
              color: page === 1 ? "#9ca3af" : "#374151",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ← Prejšnja
          </button>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isActive = p === page;

              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    minWidth: 34,
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: isActive ? "1px solid #00a4a7" : "1px solid #e5e7eb",
                    background: isActive ? "#00a4a7" : "#fff",
                    color: isActive ? "#fff" : "#374151",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: page === totalPages ? "#f9fafb" : "#fff",
              color: page === totalPages ? "#9ca3af" : "#374151",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Naslednja →
          </button>
        </div>
      )}
    </div>
    </>
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
        background: status === "loading" ? "#bfdbfe" : "#00a4a7",
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
          {/* Glava tabele */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 24px", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ width: 36, flexShrink: 0 }} />
            <div style={{ width: 160, fontSize: 11, fontWeight: 600, color: "#aaa" }}>Stranka</div>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#aaa" }}>Storitev</div>
            <div style={{ width: 130, fontSize: 11, fontWeight: 600, color: "#aaa" }}>Potek</div>
            <div style={{ width: 120, fontSize: 11, fontWeight: 600, color: "#aaa" }}>Status</div>
            <div style={{ width: 70, fontSize: 11, fontWeight: 600, color: "#aaa", textAlign: "right" }}>Strošek</div>
            <div style={{ width: 160, flexShrink: 0 }} />
          </div>

          {thisMonth.map((stranka, i) => {
            const logo = stranka._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
            const currentDate = overrides[stranka.id] || stranka.acf?.potek_storitev;
            const daysLeft = getDaysLeft(currentDate);

            return (
              <div key={stranka.id}
                style={{ padding: "12px 24px", borderBottom: i < thisMonth.length - 1 ? "1px solid #f7f7f7" : "none", display: "flex", alignItems: "center", gap: 16 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafafe")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Logo */}
                <div style={{ width: 36, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {logo
                    ? <img src={logo} alt={stranka.title.rendered} style={{ maxWidth: 36, maxHeight: 28, objectFit: "contain", borderRadius: 3 }} />
                    : <div style={{ width: 36, height: 28, background: "#f3f4f6", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏢</div>
                  }
                </div>

                {/* Ime + domena */}
                <div style={{ width: 160, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stranka.title.rendered}</div>
                  {stranka.acf?.domena_url && (
                    <a href={stranka.acf.domena_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: "#00a4a7", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                      {icons.link} {stranka.acf.domena_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>

                {/* Storitev */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#555" }}>{getStoritveLabel(stranka.acf?.storitve)}</div>
                </div>

                {/* Datum poteka */}
                <div style={{ width: 130 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>{formatACFDate(currentDate)}</div>
                  <div style={{ fontSize: 11, color: daysLeft <= 5 ? "#f59e0b" : "#aaa" }}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} dni nazaj` : daysLeft === 0 ? "danes" : `čez ${daysLeft} dni`}
                  </div>
                </div>

                {/* Badge */}
                <div style={{ width: 120 }}>
                  <PotekBadge daysLeft={daysLeft} />
                </div>

                {/* Strošek */}
                <div style={{ width: 70, textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                    {stranka.acf?.strosek ? `${stranka.acf.strosek} €` : "—"}
                  </div>
                  {stranka.acf?.strosek_obracun?.length > 0 && (
                    <div style={{ fontSize: 11, color: "#aaa" }}>/ {stranka.acf.strosek_obracun.join(", ")}</div>
                  )}
                </div>

                {/* Gumbi */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, width: 160 }}>
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
// GLOBALNO ISKANJE
// ============================================================
function GlobalSearchBar() {
  const narocniki = useWPData("narocnik");
  const ponudbe = useWPData("ponudba");
  const stranke = useWPData("stranka");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return [
      ...narocniki.posts.filter(p => p.title.rendered.toLowerCase().includes(q)).map(p => ({ ...p, cptType: "Naročnik", cptSlug: "narocnik", color: "#00a4a7" })),
      ...ponudbe.posts.filter(p => p.title.rendered.toLowerCase().includes(q)).map(p => ({ ...p, cptType: "Ponudba", cptSlug: "ponudba", color: "#10b981" })),
      ...stranke.posts.filter(p => p.title.rendered.toLowerCase().includes(q)).map(p => ({ ...p, cptType: "Stranka", cptSlug: "stranka", color: "#f59e0b" })),
    ].slice(0, 8);
  }, [query, narocniki.posts, ponudbe.posts, stranke.posts]);

  return (
    <div style={{ position: "relative", width: 500 }}>
      <div style={{ background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px" }}>
        <span style={{ color: "#aaa", flexShrink: 0 }}>{icons.search}</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Iskanje..."
          style={{ border: "none", outline: "none", fontSize: 13, color: "#333", background: "transparent", flex: 1, width: "100%" }}
        />
        {query && <button onClick={() => setQuery("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>}
      </div>

      {open && query.length >= 2 && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 1000, overflow: "hidden" }}>
          {results.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#aaa", textAlign: "center" }}>Ni rezultatov</div>
          ) : (
            results.map((item, i) => (
              <a key={`${item.cptSlug}-${item.id}`} href={`/cpt/${item.cptSlug}/${item.slug}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", textDecoration: "none", borderBottom: i < results.length - 1 ? "1px solid #f7f7f7" : "none", background: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >
                <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: item.color + "18", color: item.color, flexShrink: 0 }}>{item.cptType}</span>
                <span style={{ fontSize: 13, color: "#111", fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
                <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto", flexShrink: 0 }}>→</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// HELPERS — FINANCE & STATISTIKA
// ============================================================
const MESECI_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];

const STORITVE_COLORS: Record<string, string> = {
  domena: '#3b82f6',
  gostovanje: '#10b981',
  dom_gos: '#00a4a7',
  vzdrzevanje: '#f59e0b',
};

function getAnnualCost(cost: number, billing: string | string[]): number {
  const b = Array.isArray(billing) ? billing[0] : billing;
  switch (b) {
    case 'letno': return cost;
    case 'mesecno': return cost * 12;
    case 'trimesecno': return (cost / 3) * 12;
    case 'polletno': return (cost / 6) * 12;
    default: return 0;
  }
}

// Mini bar chart (SVG)
function BarChart({ data, color = BRAND }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const padTop = 20, h = 60, padBottom = 20;
  const totalH = padTop + h + padBottom;
  const svgW = 440;
  const barW = 24;
  const spacing = svgW / 12;
  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
      {data.map((v, i) => {
        const barH = Math.max((v / max) * h, v > 0 ? 4 : 0);
        const x = i * spacing + spacing / 2 - barW / 2;
        const y = padTop + h - barH;
        const cx = x + barW / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} opacity={0.85} />
            {v > 0 && <text x={cx} y={y - 5} textAnchor="middle" fontSize={10} fill="#555" fontWeight={600}>{v}</text>}
            <text x={cx} y={padTop + h + 15} textAnchor="middle" fontSize={10} fill="#aaa">{MESECI_SHORT[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Mini line chart (SVG)
function LineChart({ data, color = BRAND }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const padL = 30, padR = 30, padTop = 24, h = 70;
  const svgW = 440, innerW = svgW - padL - padR;
  const totalH = padTop + h + 28;

  const pts = data.map((v, i) => {
    const x = padL + (i / 11) * innerW;
    const y = padTop + h - (v / max) * h;
    return { x, y, v };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${padTop + h} ` + polyline + ` ${pts[11].x},${padTop + h}`;

  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          {p.v > 0 && <circle cx={p.x} cy={p.y} r={3.5} fill={color} />}
          {p.v > 0 && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={10} fill="#555" fontWeight={600}>
              {p.v.toLocaleString('sl-SI')}
            </text>
          )}
          <text x={p.x} y={padTop + h + 18} textAnchor="middle" fontSize={10} fill="#aaa">{MESECI_SHORT[i]}</text>
        </g>
      ))}
    </svg>
  );
}

// Donut chart (SVG)
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div style={{ padding: 20, color: '#aaa', fontSize: 13, textAlign: 'center' }}>Ni podatkov</div>;
  const r = 56, cx = 80, cy = 80, stroke = 26;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          // rotate so we start from top (-90deg), offset by cumulative
          const rotation = -90 + (cumulative / total) * 360;
          cumulative += seg.value;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation}, ${cx}, ${cy})`}
            />
          );
        })}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize={14} fontWeight={800} fill="#111">{total.toLocaleString('sl-SI')}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill="#aaa">skupaj</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{seg.label}</div>
              <div style={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{seg.value.toLocaleString('sl-SI')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STATISTIKA VIEW
// ============================================================
function StatistikaView() {
  const { stranke, loading } = useStranke();

  const { monthlyStranke, serviceStranke } = useMemo(() => {
    const monthly = Array(12).fill(0);
    const services: Record<string, number> = { domena: 0, gostovanje: 0, dom_gos: 0, vzdrzevanje: 0 };

    stranke.forEach(s => {
      const acf = s.acf as Record<string, unknown>;
      const potek = acf?.potek_storitev as string;
      const storitve = acf?.storitve as string | string[];
      const vzdrz = acf?.stanje_vzdrzevanja as boolean;
      const storitveArr = Array.isArray(storitve) ? storitve : storitve ? [storitve] : [];
      const hasVzdrz = storitveArr.includes('vzdrzevanje');

      if (!hasVzdrz || vzdrz === true) {
        if (potek && potek.length === 8) {
          const month = parseInt(potek.slice(4, 6)) - 1;
          if (month >= 0 && month < 12) monthly[month]++;
        }
        storitveArr.forEach(sv => {
          if (sv in services) services[sv]++;
        });
      }
    });

    return {
      monthlyStranke: monthly,
      serviceStranke: services,
    };
  }, [stranke]);

  const donutData = [
    { label: 'Domena', value: serviceStranke.domena, color: STORITVE_COLORS.domena },
    { label: 'Gostovanje', value: serviceStranke.gostovanje, color: STORITVE_COLORS.gostovanje },
    { label: 'Dom. & gost.', value: serviceStranke.dom_gos, color: STORITVE_COLORS.dom_gos },
    { label: 'Vzdrževanje', value: serviceStranke.vzdrzevanje, color: STORITVE_COLORS.vzdrzevanje },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Nalaganje...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {donutData.map(d => (
          <div key={d.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{d.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#111' }}>{d.value}</div>
            <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: d.color + '33' }}>
              <div style={{ height: 3, borderRadius: 2, background: d.color, width: `${stranke.length ? (d.value / stranke.length) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Grafi */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 4 }}>Stranke po mesecih</div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>Glede na datum poteka storitve</div>
          <BarChart data={monthlyStranke} color={BRAND} />
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 4 }}>Razdelitev po storitvah</div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>Število strank na storitev</div>
          <DonutChart segments={donutData} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FINANCE VIEW
// ============================================================
function FinanceView() {
  const { stranke, loading } = useStranke();

  const { totalVse, totalDomena, totalGostovanje, totalDomGos, totalVzdrz, monthlyFinance, serviceFinance } = useMemo(() => {
    let vse = 0, domena = 0, gostovanje = 0, domGos = 0, vzdrz = 0;
    const monthly = Array(12).fill(0);
    const serviceF: Record<string, number> = { domena: 0, gostovanje: 0, dom_gos: 0, vzdrzevanje: 0 };

    stranke.forEach(s => {
      const acf = s.acf as Record<string, unknown>;
      const cost = Number(acf?.strosek) || 0;
      const billing = (acf?.strosek_obracun as string | string[]) || 'letno';
      const storitve = acf?.storitve as string | string[];
      const vzdrStatus = acf?.stanje_vzdrzevanja as boolean;
      const potek = acf?.potek_storitev as string;
      const storitveArr = Array.isArray(storitve) ? storitve : storitve ? [storitve] : [];
      const hasVzdrz = storitveArr.includes('vzdrzevanje');

      if (!cost) return;

      storitveArr.forEach(sv => {
        if (sv === 'vzdrzevanje') {
          if (vzdrStatus === true) {
            const annual = getAnnualCost(cost, billing);
            vzdrz += annual;
            serviceF.vzdrzevanje += annual;
            vse += annual;
          }
        } else {
          if (sv === 'domena') { domena += cost; serviceF.domena += cost; }
          if (sv === 'gostovanje') { gostovanje += cost; serviceF.gostovanje += cost; }
          if (sv === 'dom_gos') { domGos += cost; serviceF.dom_gos += cost; }
          if (!hasVzdrz || vzdrStatus === true) vse += cost;
        }
      });

      // Mesečni graf
      if (potek && potek.length === 8 && (!hasVzdrz || vzdrStatus === true)) {
        const month = parseInt(potek.slice(4, 6)) - 1;
        if (month >= 0 && month < 12) monthly[month] += cost;
      }
    });

    return {
      totalVse: vse, totalDomena: domena, totalGostovanje: gostovanje,
      totalDomGos: domGos, totalVzdrz: vzdrz,
      monthlyFinance: monthly, serviceFinance: serviceF,
    };
  }, [stranke]);

  const donutData = [
    { label: 'Domena', value: totalDomena, color: STORITVE_COLORS.domena },
    { label: 'Gostovanje', value: totalGostovanje, color: STORITVE_COLORS.gostovanje },
    { label: 'Dom. & gost.', value: totalDomGos, color: STORITVE_COLORS.dom_gos },
    { label: 'Vzdrževanje', value: totalVzdrz, color: STORITVE_COLORS.vzdrzevanje },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Nalaganje...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Skupaj kartica */}
      <div style={{ background: `linear-gradient(135deg, ${BRAND}, #007a7d)`, borderRadius: 14, padding: '24px 28px', color: '#fff', boxShadow: '0 4px 16px rgba(0,164,167,0.3)' }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Skupni letni prihodek</div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>{totalVse.toLocaleString('sl-SI', { minimumFractionDigits: 0 })} €</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{(totalVse * 1.22).toLocaleString('sl-SI', { minimumFractionDigits: 0 })} € z DDV</div>
      </div>

      {/* Stat cards po storitvah */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {donutData.map(d => (
          <div key={d.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{d.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{d.value.toLocaleString('sl-SI')} €</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{(d.value * 1.22).toLocaleString('sl-SI')} € z DDV</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, marginTop: 4 }} />
            </div>
            <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: d.color + '22' }}>
              <div style={{ height: 3, borderRadius: 2, background: d.color, width: `${totalVse ? (d.value / totalVse) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Grafi */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 4 }}>Prihodki po mesecih</div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>Glede na datum poteka storitve</div>
          <LineChart data={monthlyFinance} color={BRAND} />
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 4 }}>Razdelitev prihodkov</div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>Po vrsti storitve</div>
          <DonutChart segments={donutData} />
        </div>
      </div>
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
      ...narocniki.posts.map((p) => ({ ...p, cptType: "Naročnik", cptSlug: "narocnik", color: "#00a4a7" })),
      ...ponudbe.posts.map((p) => ({ ...p, cptType: "Ponudba", cptSlug: "ponudba", color: "#10b981" })),
      ...stranke.posts.map((p) => ({ ...p, cptType: "Stranka", cptSlug: "stranka", color: "#f59e0b" })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [narocniki.posts, ponudbe.posts, stranke.posts]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
       <StatCard label="Naročniki" value={narocniki.total} loading={narocniki.loading} color="#00a4a7" icon={icons.users} />
       <StatCard label="Ponudbe" value={ponudbe.total} loading={ponudbe.loading} color="#10b981" icon={icons.file} />
       <StatCard label="Stranke" value={stranke.total} loading={stranke.loading} color="#f59e0b" icon={icons.building} />
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
// OPRAVILA — HOOK, MODAL, VIEW
// ============================================================

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
    stranka_rel: Array<{ ID: number; post_title: string; post_name: string }>;
    placano: boolean;
  };
};

function useOpravila(strankaId?: number) {
  const [opravila, setOpravila] = useState<Opravilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!WP_URL) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const url = strankaId
        ? `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo?per_page=100&_embed=1&acf_format=standard`
        : `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo?per_page=100&_embed=1&acf_format=standard`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      let data: Opravilo[] = await res.json();
      if (strankaId) {
        data = data.filter(o => {
          const rel = o.acf?.stranka_rel;
          if (!rel) return false;
          if (Array.isArray(rel)) return rel.some((r: { ID: number }) => r.ID === strankaId);
          return false;
        });
      }
      data.sort((a, b) => (b.acf?.datum_opravila || "").localeCompare(a.acf?.datum_opravila || ""));
      setOpravila(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [strankaId]);
  return { opravila, loading, error, refetch: fetchData };
}

function useCurrentUser() {
  const [username, setUsername] = useState("");
  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => setUsername(d.username || ""));
  }, []);
  return username;
}

function UserMenu() {
  const [user, setUser] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setUser(data.username || ""))
      .catch(() => setUser(""));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    user === "nejc"
      ? "Nejc Doplhar"
      : user === "klemen"
      ? "Klemen"
      : user || "Uporabnik";

  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 14,
          background: "#fff",
          border: 0,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: BRAND,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ textAlign: "left", lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: "#888" }}>
            Prijavljen uporabnik
          </div>
        </div>

        <div style={{ color: "#888", display: "flex", alignItems: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 220,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
            zIndex: 2000,
          }}
        >
        <a
            href="/admin?view=profil"
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Nastavitve profila
          </a>

          <a
            href={WP_ADMIN_URL}
            target="_blank"
            rel="noreferrer"
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            WP admin
          </a>

          <button
            onClick={handleLogout}
                        style={{
              ...menuItemStyle,
              width: "100%",
              textAlign: "left",
              background: "#fff",
              border: "none",
              borderBottom: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Odjava
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "12px 14px",
  fontSize: 13,
  color: "#111",
  textDecoration: "none",
  cursor: "pointer",
  borderBottom: "1px solid #f3f4f6",
};

// Format ACF date YYYYMMDD → sl-SI
function fmtDate(d: string): string {
  if (!d || d.length !== 8) return d || "—";
  return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toLocaleDateString("sl-SI");
}

// Today as YYYYMMDD
function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

// Cas options: 0.5, 1, 1.5 ... 16
const CAS_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5);

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
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }}
      />
      {open && (
        <div style={{
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
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "#888" }}>Ni rezultatov</div>
          ) : (
            filtered.map((s, i) => (
              <button key={s.id} type="button"
                onClick={() => { onChange(String(s.id)); setQuery(""); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#fff", cursor: "pointer", fontSize: 14, color: "#111", borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none", whiteSpace: "normal", wordBreak: "break-word" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdfc"; e.currentTarget.style.color = BRAND; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#111"; }}
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

// ---- Modal forma ----
function DodajOpraviloModal({
  onClose,
  onSaved,
  stranke,
  defaultStrankaId,
  username,
}: {
  onClose: () => void;
  onSaved: () => void;
  stranke: Post[];
  defaultStrankaId?: number;
  username: string;
}) {
  const [form, setForm] = useState({
    datum_opravila: todayYMD(),
    naslov_opravila: "",
    opis_opravila: "",
    cas_ure: "0.5",
    custom_postavka: false,
    urna_postavka: "35",
    stranka_id: defaultStrankaId ? String(defaultStrankaId) : "",
    placano: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.naslov_opravila.trim()) { setError("Naslov je obvezen"); return; }
    if (!form.stranka_id) { setError("Izberi stranko"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/opravilo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, uporabnik: username, stranka_id: parseInt(form.stranka_id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved();
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    background: "#fff",
  };

  const primaryButton: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: BRAND,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  };

  const secondaryButton: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Dodaj opravilo</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", display: "flex" }}>{icons.close}</button>
        </div>

        {/* Body — overflowX visible so dropdown isn't clipped */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {/* Stranka */}
          <div>
            <label style={labelStyle}>Stranka *</label>
            <StrankaSearchSelect
              stranke={stranke}
              value={form.stranka_id}
              onChange={(val) => set("stranka_id", val)}
            />
          </div>

          {/* Datum + Uporabnik */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Datum opravila</label>
              <input type="date" value={`${form.datum_opravila.slice(0,4)}-${form.datum_opravila.slice(4,6)}-${form.datum_opravila.slice(6,8)}`}
                onChange={e => set("datum_opravila", e.target.value.replace(/-/g, ""))}
                style={profileInputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Uporabnik</label>
              <input value={username} disabled style={{ ...inputStyle, background: "#f8f9fb", color: "#888" }} />
            </div>
          </div>

          {/* Naslov */}
          <div>
            <label style={labelStyle}>Naslov opravila *</label>
            <input value={form.naslov_opravila} onChange={e => set("naslov_opravila", e.target.value)}
              placeholder="npr. Popravek kontaktnega obrazca" style={profileInputStyle} />
          </div>

          {/* Opis */}
          <div>
            <label style={labelStyle}>Opis</label>
            <textarea value={form.opis_opravila} onChange={e => set("opis_opravila", e.target.value)}
              placeholder="Podrobnejši opis opravljenega dela..." rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </div>

          {/* Čas + Postavka */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Porabljen čas</label>
              <select value={form.cas_ure} onChange={e => set("cas_ure", e.target.value)} style={profileInputStyle}>
                {CAS_OPTIONS.map(v => (
                  <option key={v} value={v}>{v} {v === 1 ? "ura" : v < 5 ? "ure" : "ur"}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Urna postavka</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" value={form.custom_postavka ? form.urna_postavka : "35"} disabled={!form.custom_postavka}
                  onChange={e => set("urna_postavka", e.target.value)}
                  style={{ ...inputStyle, background: form.custom_postavka ? "#fff" : "#f8f9fb" }} />
                <span style={{ fontSize: 13, color: "#666", whiteSpace: "nowrap" }}>€/h</span>
              </div>
            </div>
          </div>

          {/* Custom postavka checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div onClick={() => set("custom_postavka", !form.custom_postavka)}
              style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${form.custom_postavka ? BRAND : "#d1d5db"}`, background: form.custom_postavka ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {form.custom_postavka && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <label onClick={() => set("custom_postavka", !form.custom_postavka)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>
              Drugačna urna postavka
            </label>
          </div>

          {/* Znesek preview */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                width: "min(720px, 92vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }}
            >
            <span style={{ fontSize: 13, color: "#888" }}>Skupaj za to opravilo:</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
              {(parseFloat(form.cas_ure) * (form.custom_postavka ? parseFloat(form.urna_postavka) || 0 : 35)).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
            </span>
          </div>

          {/* Plačano */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div onClick={() => set("placano", !form.placano)}
              style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${form.placano ? "#16a34a" : "#d1d5db"}`, background: form.placano ? "#16a34a" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {form.placano && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <label onClick={() => set("placano", !form.placano)} style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}>Že plačano</label>
          </div>

          {error && <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>⚠️ {error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555" }}>Prekliči</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: saving ? "#99d6d8" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Shranjujem..." : "Shrani opravilo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Opravila tabela (shared) ----
function OpravilaTabela({
  opravila,
  loading,
  error,
  onRefetch,
  onDodaj,
  showStranka = true,
}: {
  opravila: Opravilo[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onDodaj: () => void;
  showStranka?: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [localPlacano, setLocalPlacano] = useState<Record<number, boolean>>({});

  const getPlacano = (o: Opravilo) => localPlacano[o.id] !== undefined ? localPlacano[o.id] : o.acf?.placano;

  const toggleSelect = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(prev => prev.size === opravila.length ? new Set() : new Set(opravila.map(o => o.id)));
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
      ids.forEach(id => updates[id] = placano);
      setLocalPlacano(prev => ({ ...prev, ...updates }));
      setSelected(new Set());
    } finally { setBulkLoading(false); }
  };

  const skupajNeplačano = opravila.filter(o => !getPlacano(o))
    .reduce((s, o) => s + (o.acf?.cas_ure || 0) * (o.acf?.custom_postavka ? (o.acf?.urna_postavka || 35) : 35), 0);

  const skupajVse = opravila
    .reduce((s, o) => s + (o.acf?.cas_ure || 0) * (o.acf?.custom_postavka ? (o.acf?.urna_postavka || 35) : 35), 0);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {selected.size > 0 && (
            <>
              <span style={{ fontSize: 13, color: "#555" }}>{selected.size} izbranih</span>
              <button onClick={() => updatePlacano(Array.from(selected), true)} disabled={bulkLoading}
                style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                ✓ Označi kot plačano
              </button>
              <button onClick={() => updatePlacano(Array.from(selected), false)} disabled={bulkLoading}
                style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#555", fontSize: 13, cursor: "pointer" }}>
                Označi kot neplačano
              </button>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#888" }}>
            Neplačano: <strong style={{ color: "#dc2626" }}>{skupajNeplačano.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</strong>
            <span style={{ margin: "0 8px", color: "#ddd" }}>|</span>
            Skupaj: <strong>{skupajVse.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</strong>
          </div>
          <button onClick={onRefetch} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#aaa", display: "flex" }}>{icons.refresh}</button>
          <button onClick={onDodaj}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            + Dodaj opravilo
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {loading && <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje opravil...</div>}
        {error && <div style={{ padding: 20, color: "#dc2626", fontSize: 13, background: "#fef2f2" }}>⚠️ {error}</div>}
        {!loading && !error && opravila.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Ni opravil za prikaz.</div>
        )}
        {!loading && opravila.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ padding: "10px 16px", width: 36 }}>
                  <div onClick={toggleAll}
                    style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected.size === opravila.length ? BRAND : "#d1d5db"}`, background: selected.size === opravila.length ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected.size === opravila.length && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </th>
                {showStranka && <th style={thS}>Stranka</th>}
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
                const isSelected = selected.has(o.id);
                return (
                  <tr key={o.id} style={{ borderBottom: i < opravila.length - 1 ? "1px solid #f7f7f7" : "none", background: isSelected ? "#f0fdf4" : "transparent" }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#fafafa"; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div onClick={() => toggleSelect(o.id)}
                        style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? BRAND : "#d1d5db"}`, background: isSelected ? BRAND : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </td>
                    {showStranka && (
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#555" }}>
                        {Array.isArray(o.acf?.stranka_rel) && o.acf.stranka_rel[0]?.post_title || "—"}
                      </td>
                    )}
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#666", whiteSpace: "nowrap" }}>{fmtDate(o.acf?.datum_opravila)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{o.acf?.naslov_opravila || o.title.rendered}</div>
                      {o.acf?.opis_opravila && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{o.acf.opis_opravila.slice(0, 80)}{o.acf.opis_opravila.length > 80 ? "..." : ""}</div>}
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
                      <button onClick={() => updatePlacano([o.id], !placano)}
                        style={{ padding: "4px 10px", borderRadius: 16, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11,
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
    </div>
  );
}

const thS: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0" };

// ---- Opravila View (tab) ----
function OpravilaView() {
  const { opravila, loading, error, refetch } = useOpravila();
  const { stranke, loading: strankeLoading } = useStranke();
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
      />
    </div>
  );
}

function SidebarUser() {
  const [user, setUser] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUser(d.username || ""));
  }, []);

  const display =
    user === "nejc"
      ? "Nejc Doplhar"
      : user === "klemen"
      ? "Klemen"
      : user || "Uporabnik";

  const initials = display
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        padding: "16px 18px",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: BRAND,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      <div>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
          {display}
        </div>
        <div style={{ color: "#64748b", fontSize: 11 }}>
          prijavljen uporabnik
        </div>
      </div>
    </div>
  );
}

function ProfilView() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    position: "",
    avatarUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Napaka");

        setUsername(data.username);
        setProfile(data.profile);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const initials = (profile.fullName || username || "U")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Profil uspešno shranjen.");
    } catch (e: any) {
      setError(e.message);
    }

    setSaving(false);
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== repeatPassword) {
      setPasswordError("Gesli se ne ujemata.");
      return;
    }

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPasswordMessage("Geslo uspešno spremenjeno.");
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
    } catch (e: any) {
      setPasswordError(e.message);
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Nalaganje profila...</div>;
  }

  return (
  <div style={{ maxWidth: 1100 }}>
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
      
      {/* LEVI PROFIL */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          padding: 24,
          textAlign: "center",
        }}
      >
       {profile.avatarUrl ? (
      
      <img
        src={profile.avatarUrl}
        alt={profile.fullName || username}
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          margin: "0 auto 16px",
        }}
      />
    ) : (
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: BRAND,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30,
          fontWeight: 700,
          margin: "0 auto 16px",
        }}
      >
        {initials}
      </div>
    )}

        <div style={{ fontWeight: 700, fontSize: 18 }}>
          {profile.fullName || username}
        </div>

        <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          @{username}
        </div>

        <div style={{ fontSize: 13, color: "#666", marginTop: 10 }}>
          {profile.position || "—"}
        </div>
      </div>
     

      {/* DESNI DEL */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* OSNOVNI PODATKI */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Osnovni podatki</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Ime in priimek</label>
              <input
                value={profile.fullName}
                onChange={(e) =>
                  setProfile({ ...profile, fullName: e.target.value })
                }
                style={profileInputStyle}
              />
            </div>

            <div>
              <label>Email</label>
              <input
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                style={profileInputStyle}
              />
            </div>

            <div>
              <label>Pozicija</label>
              <input
                value={profile.position}
                onChange={(e) =>
                  setProfile({ ...profile, position: e.target.value })
                }
                style={profileInputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label>Prikazna slika (URL)</label>
              <input
                value={profile.avatarUrl}
                onChange={(e) =>
                  setProfile({ ...profile, avatarUrl: e.target.value })
                }
                style={profileInputStyle}
              />
            </div>
          </div>

          {message && <p style={{ color: "green", marginTop: 10 }}>{message}</p>}
          {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button onClick={saveProfile} style={primaryButton}>
              {saving ? "Shranjujem..." : "Shrani podatke"}
            </button>
          </div>
        </div>

        {/* SPREMEMBA GESLA */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Sprememba gesla</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Trenutno geslo</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={profileInputStyle}
              />
            </div>

            <div>
              <label>Novo geslo</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={profileInputStyle}
              />
            </div>

            <div>
              <label>Ponovi novo geslo</label>
              <input
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                style={profileInputStyle}
              />
            </div>
          </div>

          {passwordMessage && (
            <p style={{ color: "green", marginTop: 10 }}>{passwordMessage}</p>
          )}
          {passwordError && (
            <p style={{ color: "red", marginTop: 10 }}>{passwordError}</p>
          )}

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button onClick={changePassword} style={secondaryButton}>
              Spremeni geslo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

const profileInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  marginTop: 6,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: BRAND,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111",
  fontWeight: 600,
  cursor: "pointer",
};

function SidebarProfileButton({
  sidebarOpen,
  active,
  onClick,
}: {
  sidebarOpen: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={!sidebarOpen ? "Profil" : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        background: active ? BRAND : "transparent",
        color: active ? "#fff" : "#94a3b8",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#1e293b";
          e.currentTarget.style.color = "#fff";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#94a3b8";
        }
      }}
    >
      <span style={{ flexShrink: 0 }}>{icons.users}</span>
      {sidebarOpen && <span>Profil</span>}
    </button>
  );
}



// ============================================================
// SHARED MODAL WRAPPER
// ============================================================
function ModalWrapper({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", display: "flex", padding: 4 }}>{icons.close}</button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const fldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
  fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: "inherit",
};

function BtnPrimary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: disabled ? "#99d6d8" : BRAND, color: "#fff", fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer" }}>
      {children}
    </button>
  );
}

function BtnSecondary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555" }}>
      {children}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>⚠️ {msg}</div>;
}

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
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${preview ? BRAND : "#e5e7eb"}`,
          borderRadius: 10, padding: "16px", cursor: "pointer", textAlign: "center",
          background: preview ? `${BRAND}08` : "#fafafa", transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: 14,
        }}>
        {preview ? (
          <>
            <img src={preview} alt="logo preview" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, border: "1px solid #f0f0f0", background: "#fff", padding: 4 }} />
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
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>JPG, PNG, SVG, WebP — max 5MB</div>
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ============================================================
// NOVA STRANKA MODAL
// ============================================================
function NovaStrankaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: "", storitve: [] as string[], domena_url: "", potek_storitev: "",
    stanje_storitve: true, strosek: "", strosek_obracun: ["letno"] as string[], opombe: "",
  });
  const [logoId, setLogoId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleStoritev = (slug: string) => {
    set("storitve", form.storitve.includes(slug)
      ? form.storitve.filter(s => s !== slug)
      : [...form.storitve, slug]);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Naziv stranke je obvezen"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/stranka/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logo_id: logoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); setSaving(false); }
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
    <ModalWrapper title="Nova stranka" onClose={onClose}
      footer={<><BtnSecondary onClick={onClose}>Prekliči</BtnSecondary><BtnPrimary onClick={handleSave} disabled={saving}>{saving ? "Shranjujem..." : "Ustvari stranko"}</BtnPrimary></>}>
      <FormField label="Naziv stranke" required>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="npr. Vetta d.o.o." style={fldStyle} />
      </FormField>

      <FormField label="Logotip">
        <LogoUploadField onUploaded={(id) => setLogoId(id)} />
      </FormField>

      <FormField label="Storitev">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {storitveOpcije.map(s => (
            <div key={s.slug} onClick={() => toggleStoritev(s.slug)}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500, border: `1.5px solid ${form.storitve.includes(s.slug) ? BRAND : "#e5e7eb"}`, background: form.storitve.includes(s.slug) ? `${BRAND}12` : "#fff", color: form.storitve.includes(s.slug) ? BRAND : "#555" }}>
              {s.label}
            </div>
          ))}
        </div>
      </FormField>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Domena URL">
          <input value={form.domena_url} onChange={e => set("domena_url", e.target.value)} placeholder="https://vetta.si" style={fldStyle} />
        </FormField>
        <FormField label="Potek storitev">
          <input type="date"
            value={form.potek_storitev ? `${form.potek_storitev.slice(0,4)}-${form.potek_storitev.slice(4,6)}-${form.potek_storitev.slice(6,8)}` : ""}
            onChange={e => set("potek_storitev", e.target.value.replace(/-/g, ""))}
            style={fldStyle} />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Strošek (€)">
          <input type="number" value={form.strosek} onChange={e => set("strosek", e.target.value)} placeholder="150" style={fldStyle} />
        </FormField>
        <FormField label="Obračun">
          <select value={form.strosek_obracun[0]} onChange={e => set("strosek_obracun", [e.target.value])} style={fldStyle}>
            {obracunOpcije.map(o => <option key={o.slug} value={o.slug}>{o.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Stanje storitve">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => set("stanje_storitve", !form.stanje_storitve)}
            style={{ width: 40, height: 22, borderRadius: 11, background: form.stanje_storitve ? BRAND : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: form.stanje_storitve ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
          <span style={{ fontSize: 13, color: "#555" }}>{form.stanje_storitve ? "Aktivna" : "Neaktivna"}</span>
        </div>
      </FormField>

      <FormField label="Opombe">
        <textarea value={form.opombe} onChange={e => set("opombe", e.target.value)} rows={2} placeholder="Interne opombe..." style={{ ...fldStyle, resize: "vertical" }} />
      </FormField>

      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}

// ============================================================
// NOV NAROČNIK MODAL
// ============================================================
function NovNarocnikModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", kontaktna_oseba: "", email: "", telefon: "", podjetje: "", naslov: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Naziv naročnika je obvezen"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/narocnik/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); setSaving(false); }
  };

  return (
    <ModalWrapper title="Nov naročnik" onClose={onClose}
      footer={<><BtnSecondary onClick={onClose}>Prekliči</BtnSecondary><BtnPrimary onClick={handleSave} disabled={saving}>{saving ? "Shranjujem..." : "Ustvari naročnika"}</BtnPrimary></>}>
      <FormField label="Naziv naročnika" required>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="npr. Janez Novak" style={fldStyle} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Kontaktna oseba">
          <input value={form.kontaktna_oseba} onChange={e => set("kontaktna_oseba", e.target.value)} placeholder="Janez Novak" style={fldStyle} />
        </FormField>
        <FormField label="Email">
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="janez@podjetje.si" style={fldStyle} />
        </FormField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Telefon">
          <input value={form.telefon} onChange={e => set("telefon", e.target.value)} placeholder="+386 41 123 456" style={fldStyle} />
        </FormField>
        <FormField label="Podjetje">
          <input value={form.podjetje} onChange={e => set("podjetje", e.target.value)} placeholder="Podjetje d.o.o." style={fldStyle} />
        </FormField>
      </div>
      <FormField label="Naslov">
        <input value={form.naslov} onChange={e => set("naslov", e.target.value)} placeholder="Ulica 1, 5000 Nova Gorica" style={fldStyle} />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}

// ============================================================
// NOVA PONUDBA MODAL
// ============================================================
function NovaPonudbaModal({ onClose, onSaved, stranke }: {
  onClose: () => void;
  onSaved: () => void;
  stranke: Post[];
}) {
  const [form, setForm] = useState({ title: "", znesek: "", status_ponudbe: "v_obdelavi", veljavnost: "", stranka_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Naziv ponudbe je obvezen"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/ponudba/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stranka_id: form.stranka_id ? parseInt(form.stranka_id) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Napaka"); setSaving(false); }
  };

  const statusOpcije = [
    { slug: "v_obdelavi", label: "V obdelavi" },
    { slug: "poslana", label: "Poslana" },
    { slug: "sprejeta", label: "Sprejeta" },
    { slug: "zavrnjena", label: "Zavrnjena" },
  ];

  return (
    <ModalWrapper title="Nova ponudba" onClose={onClose}
      footer={<><BtnSecondary onClick={onClose}>Prekliči</BtnSecondary><BtnPrimary onClick={handleSave} disabled={saving}>{saving ? "Shranjujem..." : "Ustvari ponudbo"}</BtnPrimary></>}>
      <FormField label="Naziv ponudbe" required>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="npr. Spletna stran 2025" style={fldStyle} />
      </FormField>
      <FormField label="Stranka">
        <StrankaSearchSelect stranke={stranke} value={form.stranka_id} onChange={v => set("stranka_id", v)} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Znesek (€)">
          <input type="number" value={form.znesek} onChange={e => set("znesek", e.target.value)} placeholder="1200" style={fldStyle} />
        </FormField>
        <FormField label="Status">
          <select value={form.status_ponudbe} onChange={e => set("status_ponudbe", e.target.value)} style={fldStyle}>
            {statusOpcije.map(s => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Veljavnost do">
        <input type="date" value={form.veljavnost} onChange={e => set("veljavnost", e.target.value)} style={fldStyle} />
      </FormField>
      <ErrorMsg msg={error} />
    </ModalWrapper>
  );
}


// ============================================================
// POTRDITVENI DIALOG ZA BRISANJE
// ============================================================
function ConfirmDeleteDialog({ naziv, onConfirm, onCancel, deleting }: {
  naziv: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "24px 24px 16px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 8 }}>Premakni v koš?</div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
            <strong style={{ color: "#111" }}>{naziv}</strong> bo premaknjen v WordPress koš. Obnovitev je možna iz WP admina.
          </div>
        </div>
        <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={deleting}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer", color: "#555" }}>
            Prekliči
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: deleting ? "#fca5a5" : "#dc2626", color: "#fff", fontSize: 14, fontWeight: 600, cursor: deleting ? "default" : "pointer" }}>
            {deleting ? "Brišem..." : "Premakni v koš"}
          </button>
        </div>
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
  const { countdown, resetTimer, logout } = useSessionTimeout();

  // Modal state
  const [showNovaStranka, setShowNovaStranka] = useState(false);
  const [showNovNarocnik, setShowNovNarocnik] = useState(false);
  const [showNovaPonudba, setShowNovaPonudba] = useState(false);
  const [dataTableKey, setDataTableKey] = useState(0);
  const { stranke: strankeList } = useStranke();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");

    if (
      view === "dashboard" ||
      view === "narocnik" ||
      view === "ponudba" ||
      view === "stranka" ||
      view === "opravila" ||
      view === "statistika" ||
      view === "finance" ||
      view === "profil"
    ) {
      setActiveView(view);
    }
  }, []);
  
  const navItems = [
    { id: "dashboard" as ActiveView, label: "Pregled", icon: icons.dashboard },
    { id: "narocnik" as ActiveView, label: "Naročniki", icon: icons.users },
    { id: "ponudba" as ActiveView, label: "Ponudbe", icon: icons.file },
    { id: "stranka" as ActiveView, label: "Stranke", icon: icons.building },
    { id: "opravila" as ActiveView, label: "Opravila", icon: icons.task },
    { id: "statistika" as ActiveView, label: "Statistika", icon: icons.chart },
    { id: "finance" as ActiveView, label: "Finance", icon: icons.euro },
  ];

  const titles: Record<ActiveView, string> = {
    dashboard: "Pregled", narocnik: "Naročniki", ponudba: "Ponudbe",
    stranka: "Stranke", opravila: "Opravila", statistika: "Statistika", finance: "Finance", profil: "Nastavitve profila",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {countdown !== null && (
        <SessionWarning countdown={countdown} onStay={resetTimer} onLogout={logout} />
      )}
      <aside style={{ width: sidebarOpen ? 200 : 68, minWidth: sidebarOpen ? 200 : 68, background: "#0f172a", display: "flex", flexDirection: "column", transition: "width 0.2s ease, min-width 0.2s ease", overflow: "hidden" }}>
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{icons.wp}</div>
          {sidebarOpen && (
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>Kodnes admin</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{"storitve.kodnes.com"}</div>
            </div>
          )}
        </div>
        
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? BRAND : "transparent", color: active ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: active ? 600 : 400, marginBottom: 2, transition: "all 0.15s", textAlign: "left" }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}

  
        </nav>

      <div style={{ padding: "10px", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 8 }}>
        <SidebarProfileButton
          sidebarOpen={sidebarOpen}
          active={activeView === "profil"}
          onClick={() => setActiveView("profil")}
        />

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={!sidebarOpen ? "Skrči / razširi" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "#475569",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#1e293b";
            e.currentTarget.style.color = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#475569";
          }}
        >
          {icons.menu}
          {sidebarOpen && <span style={{ fontSize: 13 }}>Skrči</span>}
        </button>
      </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 13, color: "#aaa" }}>Kodnes CMS / </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{titles[activeView]}</span>
          </div>
          {/* Iskanje v headerju */}
          <GlobalSearchBar />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UserMenu />
        </div>
        </header>

        <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: 0 }}>{titles[activeView]}</h1>
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              {activeView === "dashboard" ? "Pregled vseh vsebin iz Kodnes CMS" :
              activeView === "statistika" ? "Statistika strank po mesecih in storitvah" :
              activeView === "finance" ? "Pregled prihodkov in finančnih podatkov" :
              activeView === "opravila" ? "Vsa opravila in popravki za stranke" :
              activeView === "profil" ? "Urejanje podatkov prijavljenega uporabnika" :
              `Vsi zapisi tipa "${titles[activeView]}" iz WordPressa`}
            </p>
          </div>
          {/* Modals */}
          {showNovaStranka && <NovaStrankaModal onClose={() => setShowNovaStranka(false)} onSaved={() => setDataTableKey(k => k + 1)} />}
          {showNovNarocnik && <NovNarocnikModal onClose={() => setShowNovNarocnik(false)} onSaved={() => setDataTableKey(k => k + 1)} />}
          {showNovaPonudba && <NovaPonudbaModal onClose={() => setShowNovaPonudba(false)} onSaved={() => setDataTableKey(k => k + 1)} stranke={strankeList} />}

          {activeView === "dashboard" ? <DashboardOverview /> :
          activeView === "statistika" ? <StatistikaView /> :
          activeView === "finance" ? <FinanceView /> :
          activeView === "opravila" ? <OpravilaView /> :
          activeView === "profil" ? <ProfilView /> :
          <DataTable key={dataTableKey} cptSlug={activeView}
            onAdd={activeView === "stranka" ? () => setShowNovaStranka(true) :
                   activeView === "narocnik" ? () => setShowNovNarocnik(true) :
                   activeView === "ponudba" ? () => setShowNovaPonudba(true) : undefined}
          />}
        </div>
      </main>
    </div>
  );
}