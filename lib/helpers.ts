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

export function getAcfPreview(acf?: Record<string, unknown>): [string, unknown][] {
  if (!acf) return [];
  return Object.entries(acf)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, 3);
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
