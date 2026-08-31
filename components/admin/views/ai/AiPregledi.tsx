"use client";
import { useMemo, type CSSProperties } from "react";
import { useStranke } from "@/hooks/useWPData";
import { getAnnualCost, getDaysLeft, getStoritveLabel, formatACFDate } from "@/lib/helpers";
import { BRAND } from "@/lib/constants";

const eur = (n: number) => new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(n || 0);
const clean = (s?: string) => (s || "").replace(/<[^>]*>/g, "").trim();

const card: CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #f0f0f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" };
const th: CSSProperties = { textAlign: "left", padding: "10px 14px", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #f0f0f0" };
const td: CSSProperties = { padding: "10px 14px", fontSize: 13, color: "#333", borderTop: "1px solid #f7f7f7" };

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #f0f0f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function AiPregledi() {
  const { stranke, loading } = useStranke();

  const data = useMemo(() => {
    const active = stranke.filter((s) => !!s.acf?.stanje_storitve);
    const annualOf = (s: (typeof stranke)[number]) => getAnnualCost(Number(s.acf?.strosek || 0), s.acf?.strosek_obracun);
    const arr = active.reduce((sum, s) => sum + annualOf(s), 0);

    const byType: Record<string, { count: number; annual: number }> = {};
    for (const s of active) {
      const key = getStoritveLabel(s.acf?.storitve) || "—";
      byType[key] = byType[key] || { count: 0, annual: 0 };
      byType[key].count += 1;
      byType[key].annual += annualOf(s);
    }
    const top = [...active].sort((a, b) => annualOf(b) - annualOf(a)).slice(0, 10)
      .map((s) => ({ name: clean(s.title?.rendered), annual: annualOf(s) }));

    const withDays = active
      .map((s) => ({ id: s.id, name: clean(s.title?.rendered), service: getStoritveLabel(s.acf?.storitve), date: formatACFDate(s.acf?.potek_storitev), days: getDaysLeft(s.acf?.potek_storitev), annual: annualOf(s) }))
      .filter((x) => x.days >= 0);
    const exp = (n: number) => withDays.filter((x) => x.days <= n).length;
    const expiring = withDays.filter((x) => x.days <= 30).sort((a, b) => a.days - b.days);

    return {
      total: stranke.length, active: active.length, arr: Math.round(arr * 100) / 100,
      types: Object.entries(byType).sort((a, b) => b[1].annual - a[1].annual),
      top, expiring, in30: exp(30), in60: exp(60), in90: exp(90),
    };
  }, [stranke]);

  if (loading) return <p style={{ color: "#999", fontSize: 14 }}>Nalagam podatke…</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat label="Letni ponavljajoči prihodek" value={eur(data.arr)} color={BRAND} />
        <Stat label="Aktivne stranke" value={String(data.active)} sub={`${data.total} skupaj`} color="#111" />
        <Stat label="Poteče v 30 dneh" value={String(data.in30)} sub={`60d: ${data.in60} · 90d: ${data.in90}`} color="#d97706" />
        <Stat label="Vrst storitev" value={String(data.types.length)} color="#111" />
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>Prihodek po vrsti storitve</h3>
      <div style={{ ...card, marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Storitev</th><th style={{ ...th, textAlign: "right" }}>Št.</th><th style={{ ...th, textAlign: "right" }}>Letni prihodek</th></tr></thead>
          <tbody>
            {data.types.map(([n, v]) => (
              <tr key={n}><td style={td}>{n}</td><td style={{ ...td, textAlign: "right" }}>{v.count}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{eur(v.annual)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>Top stranke po prihodku</h3>
          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
              {data.top.map((c, i) => (
                <tr key={c.name + i}><td style={{ ...td, color: "#bbb", width: 28 }}>{i + 1}.</td><td style={td}>{c.name}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{eur(c.annual)}</td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>Poteče v 30 dneh ({data.expiring.length})</h3>
          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
              {data.expiring.length === 0 && <tr><td style={{ ...td, color: "#999" }}>Ni bližnjih potekov.</td></tr>}
              {data.expiring.map((s) => (
                <tr key={s.id}><td style={td}>{s.name}</td><td style={{ ...td, color: "#888" }}>{s.service}</td><td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{s.date} <span style={{ color: "#bbb" }}>({s.days}d)</span></td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}
