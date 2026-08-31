// lib/agentChatTools.ts
// Orodja za dashboard AI klepet (Anthropic Tool Runner). Branje gre neposredno
// prek lib/agent* (brez HTTP/tokena, znotraj seje); pisanje NIKOLI ne piše —
// ustvari predlog (agent_action), ki ga človek potrdi v Odobritvah.

import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { getAllCPT, parseStranka, parseOpravilo } from "./agentData";
import { financeSummary, expiringServices } from "./agentReports";
import { createAction } from "./agentActions";

const eur = (n: number) =>
  new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(n || 0);

export const chatTools = [
  betaTool({
    name: "list_clients",
    description: "Seznam naročnikov (strank) z živimi podatki; neobvezno išči po imenu/domeni. Vrne tudi id-je.",
    inputSchema: {
      type: "object",
      properties: { search: { type: "string", description: "delni niz imena ali domene" } },
    },
    run: async (input: { search?: string }) => {
      const s = (input.search || "").toLowerCase().trim();
      let rows = (await getAllCPT("stranka")).map(parseStranka);
      if (s) rows = rows.filter((r) => r.name.toLowerCase().includes(s) || (r.domain || "").toLowerCase().includes(s));
      if (!rows.length) return "Ni zadetkov.";
      return rows.slice(0, 40).map((r) =>
        `#${r.id} ${r.name} · ${r.service}${r.expiry_date ? ` · poteče ${r.expiry_date}` : ""} · ${eur(r.annual_cost)}/leto`
      ).join("\n") + (rows.length > 40 ? `\n… in še ${rows.length - 40}` : "");
    },
  }),

  betaTool({
    name: "get_client",
    description: "Podrobnosti ene stranke po id-ju, vključno z njenimi opravili.",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
    run: async (input: { id: number }) => {
      const c = (await getAllCPT("stranka")).map(parseStranka).find((r) => r.id === input.id);
      if (!c) return `Stranka #${input.id} ne obstaja.`;
      const tasks = (await getAllCPT("opravilo")).map(parseOpravilo).filter((o) => o.stranka_rel.includes(input.id));
      return [
        `${c.name} (#${c.id})`,
        `Storitev: ${c.service} · aktivna=${c.active}`,
        `Domena: ${c.domain || "—"} · poteče ${c.expiry_date || "—"} · ${eur(c.annual_cost)}/leto`,
        c.notes ? `Opombe: ${c.notes}` : "",
        `Opravila (${tasks.length}): ${tasks.slice(0, 5).map((t) => t.title).join("; ") || "—"}`,
      ].filter(Boolean).join("\n");
    },
  }),

  betaTool({
    name: "financial_summary",
    description: "Finančni pregled: ponavljajoči letni prihodek, razrez po storitvah, top stranke, bližnji poteki.",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      const f = await financeSummary();
      const types = Object.entries(f.by_service_type).sort((a, b) => b[1].annual - a[1].annual)
        .map(([n, v]) => `  ${n}: ${v.count}× → ${eur(v.annual)}/leto`).join("\n");
      const top = f.top_clients.slice(0, 5).map((c) => `  ${c.name}: ${eur(c.annual_cost)}/leto`).join("\n");
      return `Stranke: ${f.clients_total} (${f.clients_active} aktivnih)\n`
        + `Letni ponavljajoči prihodek: ${eur(f.annual_recurring_revenue)}\n`
        + `Po storitvah:\n${types}\nTop stranke:\n${top}\n`
        + `Poteki: ${f.expiring.in_30} (30d), ${f.expiring.in_60} (60d), ${f.expiring.in_90} (90d)`;
    },
  }),

  betaTool({
    name: "expiring_services",
    description: "Storitve, ki potečejo v naslednjih N dneh (privzeto 30).",
    inputSchema: { type: "object", properties: { days: { type: "number" } } },
    run: async (input: { days?: number }) => {
      const rows = await expiringServices(input.days || 30);
      if (!rows.length) return `Ni potekov v ${input.days || 30} dneh.`;
      return rows.map((r) => `${r.name} · ${r.service} · ${r.expiry_date} (${r.days_left}d) · ${eur(r.annual_cost)}/leto`).join("\n");
    },
  }),

  betaTool({
    name: "propose_create_task",
    description: "Predlagaj novo opravilo (opravilo) za stranko. NE ustvari — čaka na potrditev v Odobritvah. Rabi client_id (stranka) ali narocnik_id.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" }, client_id: { type: "number" }, narocnik_id: { type: "number" },
        description: { type: "string" }, hours: { type: "number" },
      },
      required: ["title"],
    },
    run: async (input: { title: string; client_id?: number; narocnik_id?: number; description?: string; hours?: number }) => {
      if (!input.client_id && !input.narocnik_id) return "Potrebujem client_id (stranka) ali narocnik_id — najprej poišči z list_clients.";
      const payload = {
        naslov_opravila: input.title, opis_opravila: input.description || "", cas_ure: input.hours || 0,
        uporabnik: "AI agent", placano: false, stranka_id: input.client_id, narocnik_id: input.narocnik_id,
      };
      const who = input.client_id ? `stranka #${input.client_id}` : `naročnik #${input.narocnik_id}`;
      const id = await createAction("create_task", "/api/opravilo/create", payload, `Ustvari opravilo »${input.title}« za ${who}`);
      return `Predlagano (#${id}) — čaka na potrditev v Odobritvah. Nič ni bilo zapisano.`;
    },
  }),

  betaTool({
    name: "propose_update_client",
    description: "Predlagaj posodobitev stranke (spremeni le podana polja, ostalo ostane). NE piše — čaka na potrditev.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "number" }, potek_storitev: { type: "string", description: "YYYYMMDD" },
        strosek: { type: "number" }, stanje_storitve: { type: "boolean" }, domena_url: { type: "string" },
      },
      required: ["client_id"],
    },
    run: async (input: { client_id: number; potek_storitev?: string; strosek?: number; stanje_storitve?: boolean; domena_url?: string }) => {
      const c = (await getAllCPT("stranka")).map(parseStranka).find((r) => r.id === input.client_id);
      if (!c) return `Stranka #${input.client_id} ne obstaja.`;
      const raw: Record<string, unknown> = { ...(c._raw || {}), id: input.client_id };
      const applied: string[] = [];
      for (const k of ["potek_storitev", "strosek", "stanje_storitve", "domena_url"] as const) {
        if (input[k] !== undefined) { raw[k] = input[k]; applied.push(k); }
      }
      if (!applied.length) return "Nič za spremeniti.";
      const id = await createAction("update_client", "/api/stranka/update", raw, `Posodobi ${c.name} (#${c.id}): ${applied.join(", ")}`);
      return `Predlagano (#${id}) — čaka na potrditev v Odobritvah. Nič ni bilo zapisano.`;
    },
  }),

  betaTool({
    name: "propose_create_offer",
    description: "Predlagaj novo ponudbo (ponudba) v sistemu. NE piše — čaka na potrditev.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, znesek: { type: "number" }, stranka_id: { type: "number" } },
      required: ["title", "znesek"],
    },
    run: async (input: { title: string; znesek: number; stranka_id?: number }) => {
      const payload = { title: input.title, znesek: input.znesek, status_ponudbe: "v_obdelavi", veljavnost: "", stranka_id: input.stranka_id };
      const who = input.stranka_id ? ` za stranko #${input.stranka_id}` : "";
      const id = await createAction("create_offer", "/api/ponudba/create", payload, `Ustvari ponudbo »${input.title}«${who} (${input.znesek} €)`);
      return `Predlagano (#${id}) — čaka na potrditev v Odobritvah. Nič ni bilo zapisano.`;
    },
  }),
];
