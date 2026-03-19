"use client";
// components/admin/views/DashboardOverview.tsx
// Pregledna plošča — statistike, stranke ta mesec, nedavna aktivnost
// Mobilno prilagojena verzija

import { useState, useMemo, useEffect } from "react";
import { useWPData, useStranke } from "@/hooks/useWPData";
import { getDaysLeft, isThisMonth, formatACFDate, getStoritveLabel, getAnnualCost } from "@/lib/helpers";
import { BRAND, WP_ADMIN_URL } from "@/lib/constants";
import { StatCard } from "../UI";
import { icons } from "../Icons";
import type { Stranka } from "@/types/admin";
import type { ActivityEntry } from "@/lib/activityLog";

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
// POTEK BADGE
// ============================================================
function PotekBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#dc2626", letterSpacing: 0.3 }}>POTEKLO</span>;
  if (daysLeft <= 5)
    return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#d97706", letterSpacing: 0.3 }}>KMALU POTEČE</span>;
  return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#16a34a", letterSpacing: 0.3 }}>VELJAVNO</span>;
}

// ============================================================
// PODALJŠAJ BUTTON
// ============================================================
function PodaljsajButton({ strankaId, currentDate, title, onSuccess }: {
  strankaId: number; currentDate: string; title?: string; onSuccess: (newDate: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handlePodaljsaj = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/podaljsaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: strankaId, currentDate, title }),
      });
      if (!res.ok) throw new Error("Napaka");
      const data = await res.json();
      onSuccess(data.newDate);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  if (status === "done") return <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, padding: "6px 14px", background: "#dcfce7", borderRadius: 8, whiteSpace: "nowrap" }}>✓ Podaljšano</span>;
  if (status === "error") return <span style={{ fontSize: 12, color: "#dc2626", padding: "6px 14px" }}>Napaka</span>;

  return (
    <button
      onClick={handlePodaljsaj}
      disabled={status === "loading"}
      style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: status === "loading" ? "#99d6d8" : BRAND, color: "#fff", fontSize: 13, fontWeight: 600, cursor: status === "loading" ? "default" : "pointer", whiteSpace: "nowrap" }}
    >
      {status === "loading" ? "..." : "Podaljšaj"}
    </button>
  );
}

// ============================================================
// STRANKE TA MESEC — TABELA (desktop) + KARTICE (mobilni)
// ============================================================
function StrankeTekoMesec({ stranke: initialStranke, loading }: { stranke: Stranka[]; loading: boolean }) {
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const isMobile = useIsMobile();

  const handleDateUpdate = (id: number, newDate: string) => {
    setOverrides((prev) => ({ ...prev, [id]: newDate }));
  };

  const now = new Date();
  const mesecIme = now.toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
  const mesecNaslov = mesecIme.charAt(0).toUpperCase() + mesecIme.slice(1);

  const thisMonth = useMemo(() => {
    return initialStranke
      .filter((s) => {
        if (!s.acf?.stanje_storitve) return false; // samo aktivne
        const date = overrides[s.id] || s.acf?.potek_storitev;
        return date && isThisMonth(date);
      })
      .sort((a, b) => {
        const da = overrides[a.id] || a.acf?.potek_storitev || "";
        const db = overrides[b.id] || b.acf?.potek_storitev || "";
        return da.localeCompare(db);
      });
  }, [initialStranke, overrides]);

  const skupajZnesek = useMemo(() => {
    return thisMonth.reduce((sum, s) => {
      const cost = Number(s.acf?.strosek) || 0;
      const billing = s.acf?.strosek_obracun;
      return sum + getAnnualCost(cost, billing);
    }, 0);
  }, [thisMonth]);

  const billingMap: Record<string, string> = { letno: "letno", mesecno: "mesečno", trimesecno: "trimesečno", polletno: "polletno" };

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", padding: 24, marginBottom: 20 }}>
        <div style={{ color: "#aaa", fontSize: 14 }}>Nalaganje strank...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "14px 16px" : "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Stranke — {mesecNaslov}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 3 }}>Stranke katerim poteče storitev ta mesec</div>
        </div>
        {thisMonth.length > 0 && (
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Skupaj</div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "#111", lineHeight: 1 }}>
              {skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {(skupajZnesek * 1.22).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV
            </div>
          </div>
        )}
      </div>

      {thisMonth.length === 0 ? (
        <div style={{ padding: "32px 24px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
          Ni strank s potekom ta mesec 🎉
        </div>
      ) : isMobile ? (
        /* ── MOBILNI PRIKAZ: kompaktne kartice ── */
        <div style={{ padding: "8px 12px" }}>
          {thisMonth.map((stranka, i) => {
            const logo = stranka._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
            const currentDate = overrides[stranka.id] || stranka.acf?.potek_storitev;
            const daysLeft = getDaysLeft(currentDate);

            return (
              <div
                key={stranka.id}
                style={{
                  borderBottom: i < thisMonth.length - 1 ? "1px solid #f0f0f0" : "none",
                  padding: "12px 4px",
                }}
              >
                {/* Vrstica 1: logo + ime + status badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid #f0f0f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {logo ? (
                      <img src={logo} alt={stranka.title.rendered} style={{ maxWidth: 28, maxHeight: 28, objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontSize: 14 }}>🏢</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: stranka.title.rendered }} />
                    <div style={{ fontSize: 12, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 5 ? "#d97706" : "#6b7280", marginTop: 1 }}>
                      Potek: <strong>{formatACFDate(currentDate)}</strong>
                      {" · "}
                      {daysLeft < 0 ? `${Math.abs(daysLeft)} dni nazaj` : daysLeft === 0 ? "danes" : `čez ${daysLeft} dni`}
                    </div>
                  </div>
                  <PotekBadge daysLeft={daysLeft} />
                </div>

                {/* Vrstica 2: gumbi — manjša, v eni vrstici */}
                <div style={{ display: "flex", gap: 6 }}>
                  <PodaljsajButton
                    strankaId={stranka.id}
                    currentDate={currentDate}
                    title={stranka.title.rendered.replace(/<[^>]*>/g, "")}
                    onSuccess={(newDate) => handleDateUpdate(stranka.id, newDate)}
                  />
                  <a
                    href={`/cpt/stranka/${stranka.slug}`}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                  >
                    Uredi ↗
                  </a>
                </div>
              </div>
            );
          })}
          {/* Footer */}
          <div style={{ padding: "12px 4px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fafafa", margin: "0 -12px -8px", paddingLeft: 16, paddingRight: 16 }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Skupni znesek:</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{(skupajZnesek * 1.22).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV</span>
          </div>
        </div>
      ) : (
        /* ── DESKTOP PRIKAZ: tabela ── */
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["", "Stranka", "Storitev", "Potek", "Status", "Strošek", ""].map((h, idx) => (
                    <th key={idx} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9ca3af", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", paddingLeft: idx === 0 ? 24 : 16, paddingRight: idx === 6 ? 24 : 16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {thisMonth.map((stranka, i) => {
                  const logo = stranka._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
                  const currentDate = overrides[stranka.id] || stranka.acf?.potek_storitev;
                  const daysLeft = getDaysLeft(currentDate);
                  const cost = Number(stranka.acf?.strosek) || 0;
                  const billing = stranka.acf?.strosek_obracun;
                  const billingLabel = Array.isArray(billing) ? billing[0] : billing || "";

                  return (
                    <tr key={stranka.id} style={{ borderBottom: i < thisMonth.length - 1 ? "1px solid #f7f7f7" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 8px 14px 24px", width: 52 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #f0f0f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {logo ? <img src={logo} alt={stranka.title.rendered} style={{ maxWidth: 36, maxHeight: 28, objectFit: "contain" }} /> : <span style={{ fontSize: 18 }}>🏢</span>}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: stranka.title.rendered }} />
                        {stranka.acf?.domena_url && (
                          <a href={stranka.acf.domena_url.startsWith("http") ? stranka.acf.domena_url : `https://${stranka.acf.domena_url}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: BRAND, textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            {stranka.acf.domena_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#555" }}>{getStoritveLabel(stranka.acf?.storitve) || "—"}</td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{formatACFDate(currentDate)}</div>
                        <div style={{ fontSize: 12, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 5 ? "#d97706" : "#6b7280", marginTop: 2 }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)} dni nazaj` : daysLeft === 0 ? "danes" : `čez ${daysLeft} dni`}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}><PotekBadge daysLeft={daysLeft} /></td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        {cost > 0 ? (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{cost.toLocaleString("sl-SI", { minimumFractionDigits: 0 })} €</div>
                            {billingLabel && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>/ {billingMap[billingLabel] || billingLabel}</div>}
                          </>
                        ) : <span style={{ color: "#aaa", fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px 14px 8px", paddingRight: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <PodaljsajButton strankaId={stranka.id} currentDate={currentDate} title={stranka.title.rendered.replace(/<[^>]*>/g, "")} onSuccess={(newDate) => handleDateUpdate(stranka.id, newDate)} />
                          <a href={`${WP_ADMIN_URL}/post.php?post=${stranka.id}&action=edit`} target="_blank" rel="noreferrer"
                            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                          >
                            Uredi <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, background: "#fafafa" }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Skupni znesek:</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{(skupajZnesek * 1.22).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// AKCIJA BADGE
// ============================================================
function AkcijaBadge({ action }: { action: ActivityEntry["action"] }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    "DODANO":     { bg: "#dcfce7", color: "#16a34a", label: "DODANO" },
    "UREJENO":    { bg: "#dbeafe", color: "#1d4ed8", label: "UREJENO" },
    "IZBRISANO":  { bg: "#fee2e2", color: "#dc2626", label: "IZBRISANO" },
    "PODALJŠANO": { bg: "#fef3c7", color: "#d97706", label: "PODALJŠANO" },
  };
  const s = map[action] || { bg: "#f0f0f0", color: "#555", label: action };
  return (
    <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
}

// ============================================================
// DASHBOARD OVERVIEW — MAIN EXPORT
// ============================================================
export function DashboardOverview() {
  const narocniki = useWPData("narocnik");
  const ponudbe = useWPData("ponudba");
  const stranke = useWPData("stranka");
  const { stranke: strankeDetailed, loading: strankeLoading } = useStranke();
  const isMobile = useIsMobile();

  // Samo stranke z aktivno storitvijo (stanje_storitve === true)
  const aktivneStranke = useMemo(() => {
    return strankeDetailed.filter((s) => s.acf?.stanje_storitve === true);
  }, [strankeDetailed]);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 20;

  useEffect(() => {
    fetch("/api/activity?limit=200")
      .then((r) => r.json())
      .then((d) => { setActivityLog(d.entries || []); setActivityLoading(false); })
      .catch(() => setActivityLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    "Stranka": "#f59e0b", "Naročnik": "#00a4a7", "Ponudba": "#10b981", "Opravilo": "#8b5cf6",
  };

  const pageItems = activityLog.slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE);
  const totalPages = Math.ceil(activityLog.length / ACTIVITY_PER_PAGE);

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 28 }}>
        <StatCard label="Naročniki" value={narocniki.total} loading={narocniki.loading} color="#00a4a7" icon={icons.users} compact={isMobile} />
        <StatCard label="Ponudbe" value={ponudbe.total} loading={ponudbe.loading} color="#10b981" icon={icons.file} compact={isMobile} />
        <StatCard label="Aktivne stranke" value={aktivneStranke.length} loading={strankeLoading} color="#f59e0b" icon={icons.building} compact={isMobile} />
      </div>

      {/* Stranke ta mesec */}
      <StrankeTekoMesec stranke={strankeDetailed} loading={strankeLoading} />

      {/* Nedavna aktivnost */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ padding: isMobile ? "14px 16px" : "18px 24px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Nedavna aktivnost</div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>Dnevnik sprememb, dodajanj in brisanj</div>
          </div>
          {activityLog.length > 0 && (
            <div style={{ fontSize: 12, color: "#aaa" }}>{activityLog.length} {activityLog.length === 1 ? "zapis" : "zapisov"}</div>
          )}
        </div>

        {activityLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>Nalaganje...</div>
        ) : activityLog.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
            Še ni zabeleženih aktivnosti. Prikazale se bodo po prvi spremembi.
          </div>
        ) : isMobile ? (
          /* ── MOBILNI PRIKAZ: kartice ── */
          <div style={{ padding: "4px 0" }}>
            {pageItems.map((item, i) => {
              const color = typeColors[item.type] || "#6b7280";
              const dt = new Date(item.timestamp);
              const dateStr = dt.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" });
              const timeStr = dt.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={item.id} style={{ padding: "12px 16px", borderBottom: i < pageItems.length - 1 ? "1px solid #f7f7f7" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111", flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </div>
                    <AkcijaBadge action={item.action} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: color + "18", color }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: 12, color: "#888" }}>{item.user}</span>
                    <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto" }}>{dateStr} · {timeStr}</span>
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
                {["Naslov", "Tip", "Akcija", "Uporabnik", "Datum in čas"].map((h) => (
                  <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item, i) => {
                const color = typeColors[item.type] || "#6b7280";
                const dt = new Date(item.timestamp);
                const dateStr = dt.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" });
                const timeStr = dt.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
                return (
                  <tr key={item.id} style={{ borderBottom: i < pageItems.length - 1 ? "1px solid #f7f7f7" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 24px", fontWeight: 600, fontSize: 14, color: "#111", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</td>
                    <td style={{ padding: "12px 24px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: color + "18", color }}>{item.type}</span>
                    </td>
                    <td style={{ padding: "12px 24px" }}><AkcijaBadge action={item.action} /></td>
                    <td style={{ padding: "12px 24px", fontSize: 13, color: "#555", fontWeight: 500 }}>{item.user}</td>
                    <td style={{ padding: "12px 24px", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{dateStr}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{timeStr}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Paginacija */}
        {activityLog.length > ACTIVITY_PER_PAGE && (
          <div style={{ padding: isMobile ? "12px 16px" : "14px 24px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {isMobile ? `${activityPage}/${totalPages}` : `Stran ${activityPage} od ${totalPages} · ${(activityPage - 1) * ACTIVITY_PER_PAGE + 1}–${Math.min(activityPage * ACTIVITY_PER_PAGE, activityLog.length)} od ${activityLog.length}`}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setActivityPage((p) => Math.max(1, p - 1))} disabled={activityPage === 1}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: activityPage === 1 ? "#f9fafb" : "#fff", color: activityPage === 1 ? "#d1d5db" : "#374151", fontSize: 13, cursor: activityPage === 1 ? "default" : "pointer", fontWeight: 500 }}>
                ← {!isMobile && "Prejšnja"}
              </button>
              <button onClick={() => setActivityPage((p) => Math.min(totalPages, p + 1))} disabled={activityPage === totalPages}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: activityPage === totalPages ? "#f9fafb" : "#fff", color: activityPage === totalPages ? "#d1d5db" : "#374151", fontSize: 13, cursor: activityPage === totalPages ? "default" : "pointer", fontWeight: 500 }}>
                {!isMobile && "Naslednja"} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
