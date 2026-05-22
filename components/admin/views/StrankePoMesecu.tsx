"use client";
// components/admin/views/StrankePoMesecu.tsx
// Pregled strank s potekom storitve v izbranem mesecu.
// Spustni seznam: 6 mesecev nazaj + tekoči + 18 mesecev naprej (25 vnosov).
// Prikaže se pod DataTable na pogledu Storitve (/admin?view=stranka).

import { useState, useMemo, useEffect } from "react";
import { useStranke } from "@/hooks/useWPData";
import {
  getDaysLeft,
  formatACFDate,
  getStoritveLabel,
  getAnnualCost,
  parseACFDate,
} from "@/lib/helpers";
import { BRAND, WP_ADMIN_URL } from "@/lib/constants";
import { Skeleton, TableSkeleton, ListSkeleton } from "../Skeletons";

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
// MOŽNOSTI MESECEV: -6 → +18
// ============================================================
function generateMonthOptions() {
  const opts: { value: string; label: string; isCurrent: boolean }[] = [];
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (let i = -6; i <= 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const name = d.toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    opts.push({ value, label, isCurrent: value === currentKey });
  }
  return opts;
}

// ============================================================
// POTEK BADGE
// ============================================================
function PotekBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return (
      <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#dc2626", letterSpacing: 0.3 }}>
        POTEKLO
      </span>
    );
  if (daysLeft <= 5)
    return (
      <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#d97706", letterSpacing: 0.3 }}>
        KMALU POTEČE
      </span>
    );
  return (
    <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#16a34a", letterSpacing: 0.3 }}>
      VELJAVNO
    </span>
  );
}

// ============================================================
// MAIN
// ============================================================
export function StrankePoMesecu() {
  const { stranke, loading } = useStranke();
  const isMobile = useIsMobile();

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const currentKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [selected, setSelected] = useState(currentKey);

  const [year, month] = useMemo(() => selected.split("-").map(Number), [selected]);

  const filtered = useMemo(() => {
    return stranke
      .filter((s) => {
        if (!s.acf?.stanje_storitve) return false; // samo aktivne
        const dt = parseACFDate(s.acf?.potek_storitev || "");
        if (!dt) return false;
        return dt.getFullYear() === year && dt.getMonth() === month - 1;
      })
      .sort((a, b) =>
        (a.acf?.potek_storitev || "").localeCompare(b.acf?.potek_storitev || "")
      );
  }, [stranke, year, month]);

  const skupajZnesek = useMemo(() => {
    return filtered.reduce((sum, s) => {
      const cost = Number(s.acf?.strosek) || 0;
      return sum + getAnnualCost(cost, s.acf?.strosek_obracun);
    }, 0);
  }, [filtered]);

  const billingMap: Record<string, string> = {
    letno: "letno",
    mesecno: "mesečno",
    trimesecno: "trimesečno",
    polletno: "polletno",
  };

  const monthLabel = monthOptions.find((o) => o.value === selected)?.label || selected;

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 20, overflow: "hidden" }}>
        <div style={{ padding: isMobile ? "14px 16px" : "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={14} width={200} />
            <Skeleton height={10} width={260} />
          </div>
          <Skeleton height={36} width={180} />
        </div>
        {isMobile ? (
          <ListSkeleton items={4} avatar />
        ) : (
          <TableSkeleton rows={4} cols={6} showAvatar />
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="ka-fade-up" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "14px 16px" : "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Stranke po mesecu poteka
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 3 }}>
            Aktivne stranke s potekom storitve v izbranem mesecu
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: isMobile ? "space-between" : "flex-end" }}>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              padding: "9px 32px 9px 14px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 14,
              color: "#111",
              background:
                "#fff url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%239ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>') no-repeat right 10px center",
              cursor: "pointer",
              minWidth: 200,
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              fontWeight: 500,
            }}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.isCurrent ? " (tekoči)" : ""}
              </option>
            ))}
          </select>
          {filtered.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>
                {filtered.length} {filtered.length === 1 ? "stranka" : filtered.length < 5 ? "stranke" : "strank"}
              </div>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#111", lineHeight: 1 }}>
                {skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {filtered.length === 0 ? (
        <div style={{ padding: "32px 24px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
          Ni aktivnih strank s potekom v izbranem mesecu ({monthLabel}).
        </div>
      ) : isMobile ? (
        /* ── MOBILNI PRIKAZ: kartice ── */
        <div style={{ padding: "8px 12px" }}>
          {filtered.map((stranka, i) => {
            const logo = stranka._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
            const date = stranka.acf?.potek_storitev || "";
            const daysLeft = getDaysLeft(date);
            return (
              <div key={stranka.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f0f0f0" : "none", padding: "12px 4px" }}>
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
                      Potek: <strong>{formatACFDate(date)}</strong>
                    </div>
                  </div>
                  <PotekBadge daysLeft={daysLeft} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={`/cpt/stranka/${stranka.slug}`}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                  >
                    Odpri ↗
                  </a>
                </div>
              </div>
            );
          })}
          <div style={{ padding: "12px 4px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fafafa", margin: "0 -12px -8px", paddingLeft: 16, paddingRight: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Skupni letni znesek:</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>
              {skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {(skupajZnesek * 1.22).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV
            </span>
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
                    <th key={idx} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9ca3af", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", paddingLeft: idx === 0 ? 24 : 16, paddingRight: idx === 6 ? 24 : 16 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((stranka, i) => {
                  const logo = stranka._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
                  const date = stranka.acf?.potek_storitev || "";
                  const daysLeft = getDaysLeft(date);
                  const cost = Number(stranka.acf?.strosek) || 0;
                  const billing = stranka.acf?.strosek_obracun;
                  const billingLabel = Array.isArray(billing) ? billing[0] : billing || "";

                  return (
                    <tr
                      key={stranka.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f7f7f7" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 8px 14px 24px", width: 52 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #f0f0f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {logo ? (
                            <img src={logo} alt={stranka.title.rendered} style={{ maxWidth: 36, maxHeight: 28, objectFit: "contain" }} />
                          ) : (
                            <span style={{ fontSize: 18 }}>🏢</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: stranka.title.rendered }} />
                        {stranka.acf?.domena_url && (
                          <a
                            href={stranka.acf.domena_url.startsWith("http") ? stranka.acf.domena_url : `https://${stranka.acf.domena_url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: BRAND, textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            {stranka.acf.domena_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#555" }}>
                        {getStoritveLabel(stranka.acf?.storitve) || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{formatACFDate(date)}</div>
                        <div style={{ fontSize: 12, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 5 ? "#d97706" : "#6b7280", marginTop: 2 }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)} dni nazaj` : daysLeft === 0 ? "danes" : `čez ${daysLeft} dni`}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <PotekBadge daysLeft={daysLeft} />
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        {cost > 0 ? (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                              {cost.toLocaleString("sl-SI", { minimumFractionDigits: 0 })} €
                            </div>
                            {billingLabel && (
                              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                                / {billingMap[billingLabel] || billingLabel}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "#aaa", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px 14px 8px", paddingRight: 24, textAlign: "right" }}>
                        <a
                          href={`${WP_ADMIN_URL}/post.php?post=${stranka.id}&action=edit`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                            e.currentTarget.style.borderColor = "#d1d5db";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.borderColor = "#e5e7eb";
                          }}
                        >
                          Uredi{" "}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, background: "#fafafa", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Skupni letni znesek:</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
              {skupajZnesek.toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {(skupajZnesek * 1.22).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} € z DDV
            </span>
          </div>
        </>
      )}
    </div>
  );
}
