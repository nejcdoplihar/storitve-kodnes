// lib/helpers.ts
// Skupne pomožne funkcije za admin vmesnik

import { STORITVE_LABELS } from "./constants";

export function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString("sl-SI");
  } catch {
    return date;
  }
}

// Človeški labeli za ACF ključe
const ACF_LABELS: Record<string, string> = {
  // Stranka
  stanje_storitve:     "Stanje",
  storitve:            "Storitev",
  domena_url:          "Domena",
  potek_storitev:      "Potek",
  strosek:             "Strošek",
  strosek_obracun:     "Obračun",
  opombe:              "Opombe",
  stanje_vzdrzevanja:  "Vzdrževanje",
  // Naročnik
  narocnik_naziv:           "Naziv",
  narocnik_kontaktna_oseba: "Kontakt",
  narocnik_naslov:          "Naslov",
  narocnik_postna_stevilka: "Poštna št.",
  narocnik_posta:           "Pošta",
  narocnik_davcna_stevilka: "Davčna št.",
  // Ponudba
  znesek:          "Znesek",
  status_ponudbe:  "Status",
  veljavnost:      "Veljavnost",
  // Opravilo
  datum_opravila:  "Datum",
  uporabnik:       "Uporabnik",
  naslov_opravila: "Naslov",
  cas_ure:         "Čas",
  placano:         "Plačano",
};

const OBRACUN_LABELS: Record<string, string> = {
  letno: "Letno", mesecno: "Mesečno", trimesecno: "Trimesečno",
  polletno: "Polletno", po_dogovoru: "Po dogovoru",
};

const STATUS_PONUDBE_LABELS: Record<string, string> = {
  v_obdelavi: "V obdelavi", poslana: "Poslana",
  sprejeta: "Sprejeta", zavrnjena: "Zavrnjena",
};

// Pretvori surovo ACF vrednost v berljiv string
function formatAcfValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  // Boolean
  if (typeof value === "boolean") return value ? "Da" : "Ne";
  if (value === "true" || value === "1") return "Da";
  if (value === "false" || value === "0") return "Ne";

  // Storitve (array ali string)
  if (key === "storitve") return getStoritveLabel(value as string | string[]);

  // Obračun
  if (key === "strosek_obracun") {
    const v = Array.isArray(value) ? value[0] : String(value);
    return OBRACUN_LABELS[v] || v;
  }

  // Status ponudbe
  if (key === "status_ponudbe") return STATUS_PONUDBE_LABELS[String(value)] || String(value);

  // ACF datum YYYYMMDD
  if ((key === "potek_storitev" || key === "datum_opravila" || key === "veljavnost") && String(value).length === 8) {
    return formatACFDate(String(value));
  }

  // Strošek z €
  if (key === "strosek" && value !== "") return `${value} €`;

  // Čas ur
  if (key === "cas_ure") return `${value} ur`;

  // Array → join
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "—";

  // Prazno
  const str = String(value).trim();
  return str || "—";
}

export function getAcfPreview(acf?: Record<string, unknown>): [string, unknown][] {
  if (!acf) return [];

  // Ključi ki jih preskočimo v pregledu (niso koristni za prikaz v tabeli)
  const SKIP = new Set([
    "narocnik_naziv", // = title, odvečno
    "naslov_opravila", // = title
    "opis_opravila",
    "custom_postavka",
    "urna_postavka",
    "stranka_rel",
    "logo",
  ]);

  return Object.entries(acf)
    .filter(([key, value]) => {
      if (SKIP.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (typeof value === "boolean") return true; // prikaži tudi false vrednosti
      if (Array.isArray(value) && value.length === 0) return false;
      const str = String(value).trim();
      return str !== "" && str !== "false" || typeof value === "boolean";
    })
    .slice(0, 4)
    .map(([key, value]) => [
      ACF_LABELS[key] || key,   // label namesto slug-a
      formatAcfValue(key, value), // formatirana vrednost
    ]);
}

export function getStoritveLabel(s: string | string[]): string {
  if (!s || (Array.isArray(s) && s.length === 0)) return "—";
  if (Array.isArray(s)) return s.map((v) => STORITVE_LABELS[v] || v).join(", ");
  return STORITVE_LABELS[s] || s;
}

// ACF datum "20260311" → Date
export function parseACFDate(d: string): Date | null {
  if (!d || d.length !== 8) return null;
  return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
}

export function formatACFDate(d: string): string {
  const dt = parseACFDate(d);
  if (!dt) return "—";
  return dt.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getDaysLeft(d: string): number {
  const dt = parseACFDate(d);
  if (!dt) return 999;
  return Math.floor((dt.getTime() - Date.now()) / 86400000);
}

export function isThisMonth(d: string): boolean {
  const dt = parseACFDate(d);
  if (!dt) return false;
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
}

// Format ACF date YYYYMMDD → sl-SI
export function fmtDate(d: string): string {
  if (!d || d.length !== 8) return d || "—";
  return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`).toLocaleDateString("sl-SI");
}

// Today as YYYYMMDD
export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function getAnnualCost(cost: number, billing: string | string[]): number {
  const b = Array.isArray(billing) ? billing[0] : billing;
  switch (b) {
    case "letno":
      return cost;
    case "mesecno":
      return cost * 12;
    case "trimesecno":
      return cost * 4;
    case "polletno":
      return cost * 2;
    default:
      return cost;
  }
}