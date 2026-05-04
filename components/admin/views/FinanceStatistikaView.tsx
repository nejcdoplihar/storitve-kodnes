"use client";
// components/admin/views/FinanceStatistikaView.tsx
// Finančni pregled in statistika strank

import { useMemo } from "react";
import { useStranke, useNarocniki } from "@/hooks/useWPData";
import { useMountedAnim } from "@/hooks/useMountedAnim";
import { BRAND, STORITVE_LABELS, STORITVE_COLORS, MESECI_SHORT } from "@/lib/constants";
import { getAnnualCost } from "@/lib/helpers";
import { EASE_OUT, DUR_LONG, STAGGER, STAGGER_CARDS, STAGGER_CHART, staggerDelay } from "@/lib/animations";
import { CardSkeleton, BarChartSkeleton, DonutChartSkeleton, ListSkeleton, Skeleton } from "@/components/admin/Skeletons";
import type { Stranka } from "@/types/admin";

// ============================================================
// SVG GRAFIKONI
// ============================================================
function BarChart({ data, color = BRAND, highlightIndex }: { data: number[]; color?: string; highlightIndex?: number }) {
  const mounted = useMountedAnim(80);
  const max = Math.max(...data, 1);
  const padTop = 24;
  const h = 70;
  const totalH = padTop + h + 28;
  const svgW = 440;
  const barW = 24;
  const spacing = svgW / 12;
  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
      {data.map((v, i) => {
        const barH = Math.max((v / max) * h, v > 0 ? 4 : 0);
        const x = i * spacing + spacing / 2 - barW / 2;
        const y = padTop + h - barH;
        const cx = x + barW / 2;
        const isHighlight = highlightIndex === i;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={color}
              rx={3}
              opacity={isHighlight ? 1 : 0.85}
              style={{
                transformBox: "fill-box",
                transformOrigin: "bottom",
                transform: mounted ? "scaleY(1)" : "scaleY(0)",
                transition: `transform ${DUR_LONG}ms ${EASE_OUT} ${i * STAGGER}ms`,
              }}
            />
            {v > 0 && (
              <text
                x={cx}
                y={y - 5}
                textAnchor="middle"
                fontSize={10}
                fill="#555"
                fontWeight={600}
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.4s ease ${i * STAGGER + 250}ms`,
                }}
              >
                {v}
              </text>
            )}
            <text x={cx} y={padTop + h + 15} textAnchor="middle" fontSize={10} fill={isHighlight ? color : "#aaa"} fontWeight={isHighlight ? 700 : 400}>
              {MESECI_SHORT[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

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
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    `${pts[0].x},${padTop + h} ` + polyline + ` ${pts[11].x},${padTop + h}`;
  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ display: "block", width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lineGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <g key={i}>
          {p.v > 0 && <circle cx={p.x} cy={p.y} r={3.5} fill={color} />}
          {p.v > 0 && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={10} fill="#555" fontWeight={600}>
              {p.v.toLocaleString("sl-SI")}
            </text>
          )}
          <text x={p.x} y={padTop + h + 18} textAnchor="middle" fontSize={10} fill="#aaa">
            {MESECI_SHORT[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({
  segments,
  unit = "",
}: {
  segments: { label: string; value: number; color: string }[];
  unit?: string;
}) {
  const mounted = useMountedAnim(80);
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0)
    return (
      <div style={{ padding: 20, color: "#aaa", fontSize: 13, textAlign: "center" }}>
        Ni podatkov
      </div>
    );
  const r = 56, cx = 80, cy = 80, stroke = 26;
  const circ = 2 * Math.PI * r;

  // Pred-izračun rotacij in razdaljnih vrednosti za vsak segment (brez mutacije v render)
  const visibleSegments = segments.filter((s) => s.value > 0);
  const segmentMeta = visibleSegments.reduce<{ rotation: number; dash: number; cumulative: number }[]>((acc, seg) => {
    const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative + visibleSegments[acc.length - 1].value : 0;
    const dash = (seg.value / total) * circ;
    const rotation = -90 + (prevCumulative / total) * 360;
    acc.push({ rotation, dash, cumulative: prevCumulative });
    return acc;
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        {visibleSegments.map((seg, i) => {
          const { rotation, dash } = segmentMeta[i];
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={mounted ? 0 : dash}
              transform={`rotate(${rotation}, ${cx}, ${cy})`}
              style={{
                transition: `stroke-dashoffset 0.8s ${EASE_OUT} ${i * STAGGER_CHART}ms`,
              }}
            />
          );
        })}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize={16} fontWeight={800} fill="#111">
          {total.toLocaleString("sl-SI")}
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize={10} fill="#aaa">
          skupaj
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        {visibleSegments.map((seg, i) => (
          <div key={i} className="ka-fade-up" style={{ display: "flex", alignItems: "center", gap: 10, animationDelay: staggerDelay(i, 200, 80) }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: seg.color,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{seg.label}</div>
              <div style={{ fontSize: 14, color: "#111", fontWeight: 700 }}>
                {seg.value.toLocaleString("sl-SI")}{unit}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TOP 5 STRANK PO LETNI VREDNOSTI
// ============================================================
function Top5StrankList({ stranke }: { stranke: Stranka[] }) {
  const mounted = useMountedAnim(120);
  const top5 = useMemo(() => {
    return stranke
      .filter((s) => s.acf?.stanje_storitve)
      .map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title.rendered.replace(/<[^>]*>/g, ""),
        annual: getAnnualCost(Number(s.acf?.strosek) || 0, s.acf?.strosek_obracun),
        logo: s._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
        storitev: (() => {
          const sv = s.acf?.storitve;
          const arr = Array.isArray(sv) ? sv : sv ? [sv] : [];
          return arr.map((v: string) => STORITVE_LABELS[v] || v).join(", ");
        })(),
      }))
      .sort((a, b) => b.annual - a.annual)
      .slice(0, 5);
  }, [stranke]);

  if (top5.length === 0) return null;
  const max = top5[0].annual || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {top5.map((s, i) => (
        <a
          key={s.id}
          href={`/cpt/stranka/${s.slug}`}
          className="ka-fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 4px",
            borderBottom: i < top5.length - 1 ? "1px solid #f3f4f6" : "none",
            textDecoration: "none",
            color: "inherit",
            animationDelay: staggerDelay(i, 250, STAGGER_CARDS),
            borderRadius: 6,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ width: 22, color: "#9ca3af", fontSize: 13, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>
            {i + 1}.
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #f0f0f0",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {s.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt={s.title} style={{ maxWidth: 32, maxHeight: 26, objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 16 }}>🏢</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.title}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, marginBottom: 6 }}>
              {s.storitev || "—"}
            </div>
            <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: BRAND,
                  borderRadius: 3,
                  width: mounted ? `${(s.annual / max) * 100}%` : "0%",
                  transition: `width 0.9s ${EASE_OUT} ${i * STAGGER_CHART + 100}ms`,
                }}
              />
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", whiteSpace: "nowrap" }}>
              {s.annual.toLocaleString("sl-SI", { minimumFractionDigits: 0 })} €
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>letno</div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ============================================================
// CARD WRAPPER
// ============================================================
function Card({ children, padding = "20px 24px", delay = 0 }: { children: React.ReactNode; padding?: string; delay?: number }) {
  return (
    <div
      className="ka-fade-up"
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        padding,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

// ============================================================
// STATISTIKA VIEW
// ============================================================
export function StatistikaView() {
  const { stranke, loading } = useStranke();
  const { narocniki, loading: narocnikiLoading } = useNarocniki();
  const isLoading = loading || narocnikiLoading;

  const aktivneStranke = useMemo(() => stranke.filter((s) => s.acf?.stanje_storitve === true), [stranke]);
  const trenutniMesec = new Date().getMonth();

  const { monthlyStranke, serviceStranke } = useMemo(() => {
    const monthly = Array(12).fill(0);
    const service: Record<string, number> = {};

    aktivneStranke.forEach((s) => {
      const d = s.acf?.potek_storitev;
      if (d && d.length === 8) {
        const month = parseInt(d.slice(4, 6)) - 1;
        if (month >= 0 && month < 12) monthly[month]++;
      }
      const storitve = s.acf?.storitve;
      const arr = Array.isArray(storitve) ? storitve : storitve ? [storitve] : [];
      arr.forEach((sv: string) => {
        service[sv] = (service[sv] || 0) + 1;
      });
    });

    return { monthlyStranke: monthly, serviceStranke: service };
  }, [aktivneStranke]);

  const donutData = Object.entries(STORITVE_LABELS).map(([slug, label]) => ({
    label,
    value: serviceStranke[slug] || 0,
    color: STORITVE_COLORS[slug] || "#888",
  }));

  const totalStoritev = Object.values(serviceStranke).reduce((a, b) => a + b, 0);

  // ── Skeleton state — uporablja skupne primitive iz components/admin/Skeletons ──
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
          <Skeleton height={130} borderRadius={14} />
          <Skeleton height={130} borderRadius={14} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
          <CardSkeleton>
            <BarChartSkeleton />
          </CardSkeleton>
          <CardSkeleton>
            <DonutChartSkeleton />
          </CardSkeleton>
        </div>
        <CardSkeleton>
          <ListSkeleton items={5} avatar />
        </CardSkeleton>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Hero: Aktivnih storitev + Naročniki ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
        {/* Aktivne storitve — gradient hero */}
        <div
          className="ka-fade-up"
          style={{
            background: `linear-gradient(135deg, ${BRAND}, #007a7d)`,
            borderRadius: 14,
            padding: "26px 30px",
            color: "#fff",
            boxShadow: "0 6px 22px rgba(0, 164, 167, 0.28)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* dekorativni krog */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              pointerEvents: "none",
            }}
          />
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, fontWeight: 500 }}>
            Aktivnih storitev
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
            {aktivneStranke.length}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>od {stranke.length} storitev skupaj</span>
            {stranke.length > aktivneStranke.length && (
              <span style={{ padding: "2px 8px", background: "rgba(255,255,255,0.18)", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                {stranke.length - aktivneStranke.length} neaktivnih
              </span>
            )}
          </div>
        </div>

        {/* Naročniki */}
        <div
          className="ka-fade-up"
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "26px 28px",
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            animationDelay: staggerDelay(1, 0, STAGGER_CARDS),
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 500 }}>Naročniki</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#111", letterSpacing: -1, lineHeight: 1 }}>
              {narocniki.length}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>
              povprečno {narocniki.length > 0 ? (aktivneStranke.length / narocniki.length).toFixed(1) : "0"} storitev / naročnik
            </span>
          </div>
        </div>
      </div>

      {/* ── Bar + Donut ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
        <Card delay={140}>
          <CardHeader
            title="Storitve po mesecu poteka"
            subtitle={`Razporeditev poteka aktivnih storitev po mesecih (${aktivneStranke.length})`}
          />
          <BarChart data={monthlyStranke} color={BRAND} highlightIndex={trenutniMesec} />
        </Card>
        <Card delay={210}>
          <CardHeader
            title="Razdelitev po storitvah"
            subtitle={`Število aktivnih storitev po vrsti (${totalStoritev})`}
          />
          <DonutChart segments={donutData} />
        </Card>
      </div>

      {/* ── Top 5 strank po vrednosti ── */}
      <Card delay={280} padding="20px 24px">
        <CardHeader
          title="Top 5 strank po letnem znesku"
          subtitle="Najvišje vrednostne aktivne storitve, preračunano na leto"
        />
        <Top5StrankList stranke={stranke} />
      </Card>
    </div>
  );
}

// ============================================================
// FINANCE VIEW
// ============================================================
export function FinanceView() {
  const { stranke, loading } = useStranke();

  const {
    totalVse,
    totalDomena,
    totalGostovanje,
    totalDomGos,
    totalVzdrz,
    monthlyFinance,
  } = useMemo(() => {
    let domena = 0, gostovanje = 0, domGos = 0, vzdrz = 0;
    const monthly = Array(12).fill(0);

    stranke.forEach((s) => {
      if (!s.acf?.stanje_storitve) return;
      const cost = Number(s.acf?.strosek) || 0;
      const billing = s.acf?.strosek_obracun;
      const annual = getAnnualCost(cost, billing);
      const storitve = s.acf?.storitve;
      const arr = Array.isArray(storitve) ? storitve : storitve ? [storitve] : [];

      arr.forEach((sv: string) => {
        if (sv === "domena") domena += annual;
        else if (sv === "gostovanje") gostovanje += annual;
        else if (sv === "dom_gos") domGos += annual;
        else if (sv === "vzdrzevanje") vzdrz += annual;
      });

      // Mesečna porazdelitev po datumu poteka
      const d = s.acf?.potek_storitev;
      if (d && d.length === 8) {
        const month = parseInt(d.slice(4, 6)) - 1;
        if (month >= 0 && month < 12) monthly[month] += annual;
      }
    });

    return {
      totalVse: domena + gostovanje + domGos + vzdrz,
      totalDomena: domena,
      totalGostovanje: gostovanje,
      totalDomGos: domGos,
      totalVzdrz: vzdrz,
      monthlyFinance: monthly,
    };
  }, [stranke]);

  const donutData = [
    { label: "Domena", value: totalDomena, color: STORITVE_COLORS.domena },
    { label: "Gostovanje", value: totalGostovanje, color: STORITVE_COLORS.gostovanje },
    { label: "Dom. & gost.", value: totalDomGos, color: STORITVE_COLORS.dom_gos },
    { label: "Vzdrževanje", value: totalVzdrz, color: STORITVE_COLORS.vzdrzevanje },
  ];

  if (loading)
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Nalaganje...</div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Skupaj kartica */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND}, #007a7d)`,
          borderRadius: 14,
          padding: "24px 28px",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(0,164,167,0.3)",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Skupni letni prihodek</div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>
          {totalVse.toLocaleString("sl-SI", { minimumFractionDigits: 0 })} €
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          {(totalVse * 1.22).toLocaleString("sl-SI", { minimumFractionDigits: 0 })} € z DDV
        </div>
      </div>

      {/* Stat cards po storitvah */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {donutData.map((d) => (
          <div
            key={d.label}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "18px 20px",
              border: "1px solid #f0f0f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{d.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>
                  {d.value.toLocaleString("sl-SI")} €
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                  {(d.value * 1.22).toLocaleString("sl-SI")} € z DDV
                </div>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: d.color,
                  marginTop: 4,
                }}
              />
            </div>
            <div
              style={{ marginTop: 10, height: 3, borderRadius: 2, background: d.color + "22" }}
            >
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: d.color,
                  width: `${totalVse ? (d.value / totalVse) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Grafi */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 4 }}>
            Prihodki po mesecih
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
            Glede na datum poteka storitve
          </div>
          <LineChart data={monthlyFinance} color={BRAND} />
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 4 }}>
            Razdelitev prihodkov
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
            Po vrsti storitve
          </div>
          <DonutChart segments={donutData} />
        </div>
      </div>
    </div>
  );
}
