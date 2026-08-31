import type { CSSProperties } from "react";
import { financeSummary, expiringServices } from "@/lib/agentReports";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

const eur = (n: number) => new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(n || 0);

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

export default async function PreglediPage() {
  const [fin, exp] = await Promise.all([financeSummary(), expiringServices(30)]);
  const types = Object.entries(fin.by_service_type).sort((a, b) => b[1].annual - a[1].annual);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat label="Letni ponavljajoči prihodek" value={eur(fin.annual_recurring_revenue)} color={BRAND} />
        <Stat label="Aktivne stranke" value={String(fin.clients_active)} sub={`${fin.clients_total} skupaj`} color="#111" />
        <Stat label="Poteče v 30 dneh" value={String(fin.expiring.in_30)} sub={`60d: ${fin.expiring.in_60} · 90d: ${fin.expiring.in_90}`} color="#d97706" />
        <Stat label="Vrst storitev" value={String(types.length)} color="#111" />
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>Prihodek po vrsti storitve</h3>
      <div style={{ ...card, marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Storitev</th><th style={{ ...th, textAlign: "right" }}>Št.</th><th style={{ ...th, textAlign: "right" }}>Letni prihodek</th></tr></thead>
          <tbody>
            {types.map(([n, v]) => (
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
              {fin.top_clients.map((c, i) => (
                <tr key={c.name}><td style={{ ...td, color: "#bbb", width: 28 }}>{i + 1}.</td><td style={td}>{c.name}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{eur(c.annual_cost)}</td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>Poteče v 30 dneh ({exp.length})</h3>
          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
              {exp.length === 0 && <tr><td style={{ ...td, color: "#999" }}>Ni bližnjih potekov.</td></tr>}
              {exp.map((s) => (
                <tr key={s.id}><td style={td}>{s.name}</td><td style={{ ...td, color: "#888" }}>{s.service}</td><td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{s.expiry_date} <span style={{ color: "#bbb" }}>({s.days_left}d)</span></td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}
