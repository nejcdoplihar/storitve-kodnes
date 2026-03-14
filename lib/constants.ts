// lib/constants.ts
// Skupne konstante za celoten admin vmesnik

export const BRAND = "#00a4a7";
export const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
export const WP_ADMIN_URL = `${(process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "")}/wp-admin`;

export const INACTIVE_MS = 5 * 60 * 1000; // 5 minut neaktivnosti
export const WARNING_S = 45;               // 45 sekund odštevalnik

export const STORITVE_LABELS: Record<string, string> = {
  domena: "Domena",
  gostovanje: "Gostovanje",
  dom_gos: "Domena & gostovanje",
  vzdrzevanje: "Vzdrževanje",
};

export const STORITVE_COLORS: Record<string, string> = {
  domena: "#3b82f6",
  gostovanje: "#10b981",
  dom_gos: "#00a4a7",
  vzdrzevanje: "#f59e0b",
};

export const MESECI = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

export const MESECI_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Avg", "Sep", "Okt", "Nov", "Dec",
];
