// app/admin/agent/page.tsx
// Interni AI-pregledi (finance + poteki). Zaščiteno z middleware (/admin/*),
// računa se strežniško prek lib/agentReports — brez tokena, znotraj prijave.

import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { financeSummary, expiringServices } from "@/lib/agentReports";

export const dynamic = "force-dynamic";

const eur = (n: number) =>
  new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(n || 0);

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: BRAND }}>{value}</div>
      {sub && <div className="mt-0.5 text-sm text-gray-500">{sub}</div>}
    </div>
  );
}

export default async function AgentReportsPage() {
  const [fin, exp] = await Promise.all([financeSummary(), expiringServices(30)]);
  const types = Object.entries(fin.by_service_type).sort((a, b) => b[1].annual - a[1].annual);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI pregledi</h1>
          <p className="text-sm text-gray-500">Samodejni finančni pregled in bližnji poteki storitev.</p>
        </div>
        <Link href="/admin" className="text-sm font-medium hover:underline" style={{ color: BRAND }}>
          ← Nazaj na dashboard
        </Link>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Letni ponavljajoči prihodek" value={eur(fin.annual_recurring_revenue)} />
        <Card label="Aktivne stranke" value={String(fin.clients_active)} sub={`${fin.clients_total} skupaj`} />
        <Card label="Poteče v 30 dneh" value={String(fin.expiring.in_30)} sub={`60d: ${fin.expiring.in_60} · 90d: ${fin.expiring.in_90}`} />
        <Card label="Vrst storitev" value={String(types.length)} />
      </div>

      {/* Prihodek po vrsti storitve */}
      <h2 className="mt-8 mb-2 text-lg font-semibold text-gray-900">Prihodek po vrsti storitve</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="px-4 py-2">Storitev</th><th className="px-4 py-2 text-right">Št.</th><th className="px-4 py-2 text-right">Letni prihodek</th></tr>
          </thead>
          <tbody>
            {types.map(([name, v]) => (
              <tr key={name} className="border-t border-gray-100">
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2 text-right">{v.count}</td>
                <td className="px-4 py-2 text-right font-medium">{eur(v.annual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Top stranke */}
        <div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Top stranke po prihodku</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {fin.top_clients.map((c, i) => (
                  <tr key={c.name} className="border-t border-gray-100 first:border-t-0">
                    <td className="px-4 py-2 text-gray-400">{i + 1}.</td>
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-right font-medium">{eur(c.annual_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Poteki v 30 dneh */}
        <div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Poteče v 30 dneh ({exp.length})</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {exp.length === 0 && (
                  <tr><td className="px-4 py-3 text-gray-500">Ni bližnjih potekov.</td></tr>
                )}
                {exp.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 first:border-t-0">
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="px-4 py-2 text-gray-500">{s.service}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{s.expiry_date} <span className="text-gray-400">({s.days_left}d)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Podatki v živo iz WordPressa. Ta stran je samo za branje.
      </p>
    </div>
  );
}
