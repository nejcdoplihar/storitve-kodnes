"use client";
// components/admin/views/FinanceStatistikaView.tsx
// Finančni pregled in statistika strank

import { useMemo } from "react";
import { useStranke } from "@/hooks/useWPData";
import { BRAND, STORITVE_LABELS, STORITVE_COLORS, MESECI_SHORT } from "@/lib/constants";
import { getAnnualCost } from "@/lib/helpers";

// ============================================================
// SVG GRAFIKONI
// ============================================================
function BarChart({ data, color = BRAND }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const padTop = 24;
  const h = 70;
  const totalH = padTop + h + 28;
  const svgW = 440;
  const barW = 24;
  const spacing = svgW / 12;
  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ display: "block", width: "100%", height: "auto" }}>
      {data.map((v, i) => {
        const barH = Math.max((v / max) * h, v > 0 ? 4 : 0);
        const x = i * spacing + spacing / 2 - barW / 2;
        const y = padTop + h - barH;
        const cx = x + barW / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} opacity={0.85} />
            {v > 0 && (
              <text x={cx} y={y - 5} textAnchor="middle" fontSize={10} fill="#555" fontWeight={600}>
                {v}
              </text>
            )}
            <text x={cx} y={padTop + h + 15} textAnchor="middle" fontSize={10} fill="#aaa">
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
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0)
    return (
      <div style={{ padding: 20, color: "#aaa", fontSize: 13, textAlign: "center" }}>
        Ni podatkov
      </div>
    );
  const r = 56, cx = 80, cy = 80, stroke = 26;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circ;
            const rotation = -90 + (cumulative / total) * 360;
            cumulative += seg.value;
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
                strokeDashoffset={0}
                transform={`rotate(${rotation}, ${cx}, ${cy})`}
              />
            );
          })}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize={14} fontWeight={800} fill="#111">
          {total.toLocaleString("sl-SI")}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill="#aaa">
          skupaj
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                <div style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>{seg.label}</div>
                <div style={{ fontSize: 13, color: "#111", fontWeight: 700 }}>
                  {seg.value.toLocaleString("sl-SI")}
                </div>
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
export function StatistikaView() {
  const { stranke, loading } = useStranke();

  const { monthlyStranke, serviceStranke } = useMemo(() => {
    const monthly = Array(12).fill(0);
    const service: Record<string, number> = {};

    stranke.forEach((s) => {
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
  }, [stranke]);

  const donutData = Object.entries(STORITVE_LABELS).map(([slug, label]) => ({
    label,
    value: serviceStranke[slug] || 0,
    color: STORITVE_COLORS[slug] || "#888",
  }));

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
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Skupaj aktivnih strank</div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>
          {stranke.length}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          {Object.values(serviceStranke).reduce((a, b) => a + b, 0)} storitev skupaj
        </div>
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
            Stranke po mesecu poteka
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
            Razporeditev poteka storitev po mesecih
          </div>
          <BarChart data={monthlyStranke} color={BRAND} />
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
            Razdelitev po storitvah
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
            Število strank po vrsti storitve
          </div>
          <DonutChart segments={donutData} />
        </div>
      </div>
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
