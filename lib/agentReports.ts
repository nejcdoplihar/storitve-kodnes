// lib/agentReports.ts
// Skupna logika poročil — uporabljajo jo tako /api/agent/* endpointi kot interna
// stran /admin/agent. Ena resnica za finance/poteke (brez podvajanja).

import { getAllCPT, parseStranka } from "./agentData";

export async function financeSummary() {
  const all = (await getAllCPT("stranka")).map(parseStranka);
  const active = all.filter((r) => r.active);

  const arr = active.reduce((sum, r) => sum + (r.annual_cost || 0), 0);

  const byType: Record<string, { count: number; annual: number }> = {};
  for (const r of active) {
    const key = r.service || "—";
    byType[key] = byType[key] || { count: 0, annual: 0 };
    byType[key].count += 1;
    byType[key].annual += r.annual_cost || 0;
  }

  const topClients = [...active]
    .sort((a, b) => (b.annual_cost || 0) - (a.annual_cost || 0))
    .slice(0, 10)
    .map((r) => ({ name: r.name, annual_cost: r.annual_cost }));

  const expiring = (n: number) =>
    active.filter((r) => r.days_left !== null && r.days_left >= 0 && r.days_left <= n).length;

  return {
    clients_total: all.length,
    clients_active: active.length,
    annual_recurring_revenue: Math.round(arr * 100) / 100,
    by_service_type: byType,
    top_clients: topClients,
    expiring: { in_30: expiring(30), in_60: expiring(60), in_90: expiring(90) },
  };
}

export async function expiringServices(days = 30) {
  return (await getAllCPT("stranka"))
    .map(parseStranka)
    .filter((r) => r.active && r.days_left !== null && r.days_left >= 0 && r.days_left <= days)
    .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0));
}
