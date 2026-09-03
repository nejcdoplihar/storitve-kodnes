// lib/agentData.ts
// Bralni podatkovni sloj za AI-agenta: pobere CPT-je iz WP (prek lib/wordpress.ts)
// in vrne že razčlenjen, čist JSON z isto poslovno logiko kot dashboard (lib/helpers.ts).

import { getStoritveLabel, getDaysLeft, getAnnualCost, formatACFDate } from "./helpers";
import type { Post } from "@/types/admin";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");

// Agent bere SVEŽE (no-store) — po zapisu potrebuje trenutno stanje, ne ISR predpomnilnika.
async function fetchPage(cpt: string, page: number, perPage = 100) {
  const url = `${WP_URL}/wp-json/wp/v2/${cpt}?_embed=true&status=publish&per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`WP ${res.status} ${res.statusText} — ${cpt}`);
  const data = (await res.json()) as Post[];
  const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
  return { data, totalPages };
}

// Pobere vse zapise nekega CPT-ja (paginacija, sveže).
export async function getAllCPT(cpt: string): Promise<Post[]> {
  const first = await fetchPage(cpt, 1);
  let all = first.data;
  for (let page = 2; page <= first.totalPages; page++) {
    all = all.concat((await fetchPage(cpt, page)).data);
  }
  return all;
}

const clean = (s?: string) => (s || "").replace(/<[^>]*>/g, "").trim();

export function parseStranka(p: Post) {
  const acf = (p.acf || {}) as Record<string, unknown>;
  const expiry = (acf.potek_storitev as string) || "";
  const cost = Number(acf.strosek ?? 0);
  // Relacija storitev→naročnik (ACF polje `stranka_narocnik`; vrne tabelo ID-jev ali objektov).
  const relRaw = acf.stranka_narocnik as unknown;
  const relFirst = Array.isArray(relRaw) ? relRaw[0] : relRaw;
  const narocnik_id =
    relFirst == null ? null
    : typeof relFirst === "object" ? ((relFirst as { ID?: number; id?: number }).ID ?? (relFirst as { id?: number }).id ?? null)
    : Number(relFirst);
  return {
    id: p.id,
    name: clean(p.title?.rendered),
    slug: p.slug,
    narocnik_id,
    active: !!acf.stanje_storitve,
    service: getStoritveLabel(acf.storitve as string | string[]),
    domain: (acf.domena_url as string) || null,
    expiry: expiry || null,
    expiry_date: expiry ? formatACFDate(expiry) : null,
    days_left: expiry ? getDaysLeft(expiry) : null,
    cost: (acf.strosek as number) ?? null,
    billing: (acf.strosek_obracun as string | string[]) || null,
    annual_cost: acf.strosek ? getAnnualCost(cost, acf.strosek_obracun as string | string[]) : 0,
    notes: (acf.opombe as string) || null,
    // Raw values for a safe round-trip update (stranka/update rebuilds the whole ACF).
    _raw: {
      title: clean(p.title?.rendered),
      storitve: acf.storitve ?? [],
      domena_url: acf.domena_url ?? "",
      potek_storitev: acf.potek_storitev ?? "",
      stanje_storitve: acf.stanje_storitve ?? false,
      strosek: acf.strosek ?? "",
      strosek_obracun: acf.strosek_obracun ?? [],
    },
  };
}

export function parseOpravilo(p: Post) {
  const acf = (p.acf || {}) as Record<string, unknown>;
  return {
    id: p.id,
    title: clean((acf.naslov_opravila as string) || p.title?.rendered),
    date: (acf.datum_opravila as string) || null,
    user: (acf.uporabnik as string) || null,
    description: (acf.opis_opravila as string) || null,
    hours: (acf.cas_ure as number) ?? null,
    hourly_rate: (acf.urna_postavka as number) ?? null,
    paid: !!acf.placano,
    stranka_rel: (acf.stranka_rel as number[]) || [],
    narocnik_rel: (acf.narocnik_rel as number[]) || [],
  };
}

export function parsePonudba(p: Post) {
  const acf = (p.acf || {}) as Record<string, unknown>;
  const rel = (acf.stranka_id ?? acf.stranka_rel) as number | number[] | null;
  return {
    id: p.id,
    title: clean(p.title?.rendered),
    date: p.date,
    amount: (acf.znesek as number) ?? null,
    status: (acf.status_ponudbe as string) ?? null,
    valid_until: (acf.veljavnost as string) ?? null,
    stranka_rel: rel ?? null,
  };
}
