// lib/agentChatTools.ts
// Orodja za dashboard AI klepet (Anthropic Tool Runner).
//
// STOPENJSKA AVTONOMIJA (dogovorjeno z uporabnikom):
//  - Nizko-tvegana dejanja (dodajanje novih zapisov + NE-finančne spremembe) izvede
//    agent SAMODEJNO prek internih write poti (Bearer AGENT_WRITE_TOKEN, strežniško).
//  - Visoko-tvegana dejanja (BRISANJE in FINANČNE spremembe obstoječih zapisov —
//    strošek, potek, urna postavka, plačano) ustvarijo PREDLOG (agent_action),
//    ki ga človek potrdi v Odobritvah. Nič se ne zapiše brez potrditve.
//
// Branje gre neposredno prek lib/agent* (znotraj seje). Pisanje gre prek internih
// poti, ker te vsebujejo validacijo, WP zapis in beleženje aktivnosti na enem mestu.

import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { getAllCPT, parseStranka, parseOpravilo } from "./agentData";
import { financeSummary, expiringServices } from "./agentReports";
import { createAction } from "./agentActions";
import type { Post } from "@/types/admin";

const WRITE_TOKEN = process.env.AGENT_WRITE_TOKEN || "";

const eur = (n: number) =>
  new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(n || 0);

const clean = (s?: string) => (s || "").replace(/<[^>]*>/g, "").trim();

// Samodejni zapis prek interne write poti (isti mehanizem kot Odobritve → Odobri).
async function autoPost(origin: string, path: string, payload: unknown): Promise<{ ok: boolean; id?: number; body: string }> {
  if (!WRITE_TOKEN) throw new Error("AGENT_WRITE_TOKEN ni nastavljen — samodejni zapis ni mogoč.");
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WRITE_TOKEN}` },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 200)}`);
  let id: number | undefined;
  try { id = JSON.parse(body)?.id; } catch { /* ignore */ }
  return { ok: true, id, body };
}

async function findStranka(id: number): Promise<Post | undefined> {
  return (await getAllCPT("stranka")).find((p) => p.id === id);
}
async function findNarocnik(id: number): Promise<Post | undefined> {
  return (await getAllCPT("narocnik")).find((p) => p.id === id);
}
async function findOpravilo(id: number): Promise<Post | undefined> {
  return (await getAllCPT("opravilo")).find((p) => p.id === id);
}

// Cel body za stranka/update — ohrani VSA obstoječa ACF polja (pot prepiše celoten ACF).
function strankaFullBody(p: Post): Record<string, unknown> {
  const a = (p.acf || {}) as Record<string, unknown>;
  return {
    id: p.id,
    title: clean(p.title?.rendered),
    storitve: a.storitve ?? [],
    domena_url: a.domena_url ?? "",
    potek_storitev: a.potek_storitev ?? "",
    stanje_storitve: a.stanje_storitve ?? false,
    stanje_vzdrzevanja: a.stanje_vzdrzevanja ?? false,
    strosek: a.strosek ?? "",
    strosek_obracun: a.strosek_obracun ?? [],
    opombe: a.opombe ?? "",
  };
}

// Cel body za narocnik/update — ohrani vsa obstoječa kontaktna polja.
function narocnikFullBody(p: Post): Record<string, unknown> {
  const a = (p.acf || {}) as Record<string, unknown>;
  return {
    id: p.id,
    title: (a.narocnik_naziv as string) || clean(p.title?.rendered),
    narocnik_kontaktna_oseba: a.narocnik_kontaktna_oseba ?? "",
    narocnik_email: a.narocnik_email ?? "",
    narocnik_telefonska_stevilka: a.narocnik_telefonska_stevilka ?? "",
    narocnik_naslov: a.narocnik_naslov ?? "",
    narocnik_postna_stevilka: a.narocnik_postna_stevilka ?? "",
    narocnik_posta: a.narocnik_posta ?? "",
    narocnik_davcna_stevilka: a.narocnik_davcna_stevilka ?? "",
  };
}

const DONE = (what: string, id?: number) =>
  `✅ Izvedeno samodejno${id ? ` (#${id})` : ""}: ${what}. Zapisano v sistem.`;
const QUEUED = (id: number, what: string) =>
  `🕒 Predlagano (#${id}) — ${what}. Čaka na tvojo POTRDITEV v Odobritvah; nič ni bilo zapisano.`;

export function buildChatTools(origin: string) {
  return [
    // ---------------- BRANJE ----------------
    betaTool({
      name: "list_clients",
      description: "Seznam strank (storitev) z živimi podatki; neobvezno išči po imenu/domeni. Vrne id-je.",
      inputSchema: { type: "object", properties: { search: { type: "string" } } },
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
      name: "list_narocniki",
      description: "Seznam naročnikov (pravnih/fizičnih strank), neobvezno išči po nazivu/emailu. Vrne id-je za povezovanje in urejanje.",
      inputSchema: { type: "object", properties: { search: { type: "string" } } },
      run: async (input: { search?: string }) => {
        const s = (input.search || "").toLowerCase().trim();
        let rows = (await getAllCPT("narocnik"));
        const parsed = rows.map((p) => {
          const a = (p.acf || {}) as Record<string, unknown>;
          return { id: p.id, naziv: (a.narocnik_naziv as string) || clean(p.title?.rendered), email: (a.narocnik_email as string) || "" };
        });
        let out = parsed;
        if (s) out = parsed.filter((r) => r.naziv.toLowerCase().includes(s) || r.email.toLowerCase().includes(s));
        if (!out.length) return "Ni zadetkov.";
        return out.slice(0, 50).map((r) => `#${r.id} ${r.naziv}${r.email ? ` · ${r.email}` : ""}`).join("\n");
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
          `Opravila (${tasks.length}): ${tasks.slice(0, 5).map((t) => `#${t.id} ${t.title}`).join("; ") || "—"}`,
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

    // ---------------- SAMODEJNO: DODAJANJE ----------------
    betaTool({
      name: "add_narocnik",
      description: "SAMODEJNO doda novega naročnika (pravno/fizično stranko). Izvede se takoj (nizko tveganje). Rabi vsaj naziv.",
      inputSchema: {
        type: "object",
        properties: {
          naziv: { type: "string" }, kontaktna_oseba: { type: "string" }, email: { type: "string" },
          telefon: { type: "string" }, naslov: { type: "string" }, postna_stevilka: { type: "string" },
          posta: { type: "string" }, davcna: { type: "string" },
        },
        required: ["naziv"],
      },
      run: async (i: { naziv: string; kontaktna_oseba?: string; email?: string; telefon?: string; naslov?: string; postna_stevilka?: string; posta?: string; davcna?: string }) => {
        const r = await autoPost(origin, "/api/narocnik/create", {
          title: i.naziv, narocnik_kontaktna_oseba: i.kontaktna_oseba, narocnik_email: i.email,
          narocnik_telefonska_stevilka: i.telefon, narocnik_naslov: i.naslov,
          narocnik_postna_stevilka: i.postna_stevilka, narocnik_posta: i.posta, narocnik_davcna_stevilka: i.davcna,
        });
        return DONE(`dodan naročnik »${i.naziv}«`, r.id);
      },
    }),

    betaTool({
      name: "add_stranka",
      description: "SAMODEJNO doda novo stranko/storitev. Izvede se takoj (dodajanje novega zapisa je nizko tveganje, tudi če vsebuje strošek). Datum poteka je YYYYMMDD.",
      inputSchema: {
        type: "object",
        properties: {
          naziv: { type: "string" }, storitve: { type: "string", description: "npr. Gostovanje, Domena, Vzdrževanje" },
          domena_url: { type: "string" }, potek_storitev: { type: "string", description: "YYYYMMDD" },
          strosek: { type: "number" }, strosek_obracun: { type: "string", description: "npr. letno/mesečno" },
          stanje_storitve: { type: "boolean" }, opombe: { type: "string" }, narocnik_id: { type: "number" },
        },
        required: ["naziv"],
      },
      run: async (i: { naziv: string; storitve?: string; domena_url?: string; potek_storitev?: string; strosek?: number; strosek_obracun?: string; stanje_storitve?: boolean; opombe?: string; narocnik_id?: number }) => {
        const r = await autoPost(origin, "/api/stranka/create", {
          title: i.naziv,
          storitve: i.storitve ? [i.storitve] : [],
          domena_url: i.domena_url || "",
          potek_storitev: i.potek_storitev || "",
          stanje_storitve: i.stanje_storitve ?? true,
          strosek: i.strosek ?? "",
          strosek_obracun: i.strosek_obracun ? [i.strosek_obracun] : [],
          opombe: i.opombe || "",
          narocnik_id: i.narocnik_id,
        });
        return DONE(`dodana stranka/storitev »${i.naziv}«`, r.id);
      },
    }),

    betaTool({
      name: "add_offer",
      description: "SAMODEJNO doda novo ponudbo (osnutek). Izvede se takoj — ponudba je interni osnutek in se NE pošlje nikamor. Rabi naslov in znesek.",
      inputSchema: {
        type: "object",
        properties: { title: { type: "string" }, znesek: { type: "number" }, stranka_id: { type: "number" }, veljavnost: { type: "string" } },
        required: ["title", "znesek"],
      },
      run: async (i: { title: string; znesek: number; stranka_id?: number; veljavnost?: string }) => {
        const r = await autoPost(origin, "/api/ponudba/create", {
          title: i.title, znesek: i.znesek, status_ponudbe: "v_obdelavi", veljavnost: i.veljavnost || "", stranka_id: i.stranka_id,
        });
        return DONE(`dodana ponudba »${i.title}« (${eur(i.znesek)})`, r.id);
      },
    }),

    betaTool({
      name: "add_task",
      description: "SAMODEJNO doda novo opravilo. Izvede se takoj. Rabi naslov in client_id (stranka) ali narocnik_id — poišči z list_clients / list_narocniki.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }, client_id: { type: "number" }, narocnik_id: { type: "number" },
          description: { type: "string" }, hours: { type: "number" },
        },
        required: ["title"],
      },
      run: async (i: { title: string; client_id?: number; narocnik_id?: number; description?: string; hours?: number }) => {
        if (!i.client_id && !i.narocnik_id) return "Potrebujem client_id (stranka) ali narocnik_id — najprej poišči z list_clients / list_narocniki.";
        const r = await autoPost(origin, "/api/opravilo/create", {
          naslov_opravila: i.title, opis_opravila: i.description || "", cas_ure: i.hours || 0,
          uporabnik: "AI agent", placano: false, stranka_id: i.client_id, narocnik_id: i.narocnik_id,
        });
        return DONE(`dodano opravilo »${i.title}«`, r.id);
      },
    }),

    // ---------------- SAMODEJNO: NE-FINANČNE SPREMEMBE ----------------
    betaTool({
      name: "update_narocnik",
      description: "SAMODEJNO posodobi kontaktne podatke naročnika (naziv/kontakt/email/telefon/naslov/pošta/davčna). Nefinančno → izvede se takoj. Spremeni le podana polja.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number" }, naziv: { type: "string" }, kontaktna_oseba: { type: "string" }, email: { type: "string" },
          telefon: { type: "string" }, naslov: { type: "string" }, postna_stevilka: { type: "string" }, posta: { type: "string" }, davcna: { type: "string" },
        },
        required: ["id"],
      },
      run: async (i: { id: number; naziv?: string; kontaktna_oseba?: string; email?: string; telefon?: string; naslov?: string; postna_stevilka?: string; posta?: string; davcna?: string }) => {
        const p = await findNarocnik(i.id);
        if (!p) return `Naročnik #${i.id} ne obstaja.`;
        const body = narocnikFullBody(p);
        const map: [keyof typeof i, string][] = [
          ["naziv", "title"], ["kontaktna_oseba", "narocnik_kontaktna_oseba"], ["email", "narocnik_email"],
          ["telefon", "narocnik_telefonska_stevilka"], ["naslov", "narocnik_naslov"],
          ["postna_stevilka", "narocnik_postna_stevilka"], ["posta", "narocnik_posta"], ["davcna", "narocnik_davcna_stevilka"],
        ];
        const changed: string[] = [];
        for (const [k, field] of map) {
          const v = i[k];
          if (v !== undefined) { body[field] = v; changed.push(String(k)); }
        }
        if (!changed.length) return "Nič za spremeniti.";
        await autoPost(origin, "/api/narocnik/update", body);
        return DONE(`posodobljen naročnik #${i.id} (${changed.join(", ")})`);
      },
    }),

    betaTool({
      name: "update_stranka_info",
      description: "SAMODEJNO posodobi NE-finančna polja stranke: domena, aktivnost, vzdrževanje, opombe, povezan naročnik. Izvede se takoj. Za strošek/potek uporabi change_stranka_financials.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number" }, domena_url: { type: "string" }, stanje_storitve: { type: "boolean" },
          stanje_vzdrzevanja: { type: "boolean" }, opombe: { type: "string" }, narocnik_id: { type: "number" },
        },
        required: ["id"],
      },
      run: async (i: { id: number; domena_url?: string; stanje_storitve?: boolean; stanje_vzdrzevanja?: boolean; opombe?: string; narocnik_id?: number }) => {
        const p = await findStranka(i.id);
        if (!p) return `Stranka #${i.id} ne obstaja.`;
        const body = strankaFullBody(p);
        const changed: string[] = [];
        for (const k of ["domena_url", "stanje_storitve", "stanje_vzdrzevanja", "opombe"] as const) {
          if (i[k] !== undefined) { body[k] = i[k]; changed.push(k); }
        }
        if (i.narocnik_id !== undefined) { (body as Record<string, unknown>).narocnik_id = i.narocnik_id; changed.push("narocnik"); }
        if (!changed.length) return "Nič za spremeniti.";
        await autoPost(origin, "/api/stranka/update", body);
        return DONE(`posodobljena stranka #${i.id} (${changed.join(", ")})`);
      },
    }),

    betaTool({
      name: "update_task",
      description: "SAMODEJNO posodobi NE-finančna polja opravila: naslov, opis, ure. Izvede se takoj. Za plačano/urno postavko uporabi set_task_paid oz. predlog.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "number" }, title: { type: "string" }, description: { type: "string" }, hours: { type: "number" } },
        required: ["id"],
      },
      run: async (i: { id: number; title?: string; description?: string; hours?: number }) => {
        const p = await findOpravilo(i.id);
        if (!p) return `Opravilo #${i.id} ne obstaja.`;
        const t = parseOpravilo(p);
        const body: Record<string, unknown> = {
          id: i.id,
          naslov_opravila: i.title ?? t.title,
          opis_opravila: i.description ?? (t.description || ""),
          cas_ure: i.hours ?? (t.hours ?? 0),
          datum_opravila: t.date || "",
          uporabnik: t.user || "AI agent",
          custom_postavka: t.hourly_rate != null,
          urna_postavka: t.hourly_rate ?? 0,   // ohrani obstoječo postavko (ne spreminjamo)
          placano: t.paid,                       // ohrani obstoječi status
          stranka_id: t.stranka_rel[0],
          narocnik_id: t.narocnik_rel[0],
        };
        await autoPost(origin, "/api/opravilo/edit", body);
        return DONE(`posodobljeno opravilo #${i.id}`);
      },
    }),

    // ---------------- PREDLOG (POTRDITEV): FINANČNE SPREMEMBE ----------------
    betaTool({
      name: "change_stranka_financials",
      description: "FINANČNA sprememba obstoječe stranke (strošek in/ali datum poteka). NE izvede — ustvari PREDLOG za potrditev v Odobritvah. Datum je YYYYMMDD.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "number" }, strosek: { type: "number" }, potek_storitev: { type: "string", description: "YYYYMMDD" } },
        required: ["id"],
      },
      run: async (i: { id: number; strosek?: number; potek_storitev?: string }) => {
        const p = await findStranka(i.id);
        if (!p) return `Stranka #${i.id} ne obstaja.`;
        if (i.strosek === undefined && i.potek_storitev === undefined) return "Podaj strošek in/ali datum poteka.";
        const body = strankaFullBody(p);
        const parts: string[] = [];
        if (i.strosek !== undefined) { body.strosek = i.strosek; parts.push(`strošek → ${eur(i.strosek)}`); }
        if (i.potek_storitev !== undefined) { body.potek_storitev = i.potek_storitev; parts.push(`potek → ${i.potek_storitev}`); }
        const id = await createAction("update_client", "/api/stranka/update", body, `Finančna sprememba ${clean(p.title?.rendered)} (#${i.id}): ${parts.join(", ")}`);
        return QUEUED(id, `finančna sprememba stranke #${i.id} (${parts.join(", ")})`);
      },
    }),

    betaTool({
      name: "set_task_paid",
      description: "Označi opravilo kot plačano/neplačano — FINANČNO. NE izvede — ustvari PREDLOG za potrditev v Odobritvah.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "number" }, paid: { type: "boolean" } },
        required: ["id", "paid"],
      },
      run: async (i: { id: number; paid: boolean }) => {
        const p = await findOpravilo(i.id);
        if (!p) return `Opravilo #${i.id} ne obstaja.`;
        const id = await createAction("set_task_paid", "/api/opravilo/update", { ids: [i.id], placano: i.paid }, `Označi opravilo #${i.id} kot ${i.paid ? "PLAČANO" : "NEPLAČANO"}`);
        return QUEUED(id, `sprememba plačila opravila #${i.id}`);
      },
    }),

    // ---------------- PREDLOG (POTRDITEV): BRISANJE ----------------
    betaTool({
      name: "delete_record",
      description: "Izbriši naročnika, stranko ali ponudbo. NE izvede — ustvari PREDLOG za potrditev v Odobritvah (brisanje je nepovratno).",
      inputSchema: {
        type: "object",
        properties: { type: { type: "string", enum: ["narocnik", "stranka", "ponudba"] }, id: { type: "number" } },
        required: ["type", "id"],
      },
      run: async (i: { type: "narocnik" | "stranka" | "ponudba"; id: number }) => {
        const id = await createAction("delete", "/api/delete", { id: i.id, cptSlug: i.type }, `Izbriši ${i.type} #${i.id}`);
        return QUEUED(id, `brisanje ${i.type} #${i.id}`);
      },
    }),

    betaTool({
      name: "delete_task",
      description: "Izbriši opravilo. NE izvede — ustvari PREDLOG za potrditev v Odobritvah (brisanje je nepovratno).",
      inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
      run: async (i: { id: number }) => {
        const id = await createAction("delete_task", "/api/opravilo/delete", { id: i.id }, `Izbriši opravilo #${i.id}`);
        return QUEUED(id, `brisanje opravila #${i.id}`);
      },
    }),
  ];
}

// Nazaj-združljiv izvoz (branje deluje brez origin-a; pisalna orodja rabijo origin).
export const chatTools = buildChatTools("");
