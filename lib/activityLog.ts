// lib/activityLog.ts
// Beleženje aktivnosti v WordPress options (wp_options tabela)
// Endpoint: /wp-json/kodnes/v1/activity-log
// PHP koda za WP: kodnes-activity-log.php

export type ActivityAction = "DODANO" | "UREJENO" | "IZBRISANO" | "PODALJŠANO";

export type ActivityEntry = {
  id: string;
  title: string;
  type: string;
  action: ActivityAction;
  user: string;
  timestamp: string;
};

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";

function getCredentials(): string {
  return Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");
}

export async function readLog(limit = 50): Promise<ActivityEntry[]> {
  try {
    const res = await fetch(
      `${WP_URL.replace(/\/$/, "")}/wp-json/kodnes/v1/activity-log?limit=${limit}`,
      {
        headers: { Authorization: `Basic ${getCredentials()}` },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`WP napaka: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("[activityLog] Napaka pri branju:", err);
    return [];
  }
}

export async function logActivity(entry: Omit<ActivityEntry, "id" | "timestamp">): Promise<void> {
  try {
    const res = await fetch(
      `${WP_URL.replace(/\/$/, "")}/wp-json/kodnes/v1/activity-log`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${getCredentials()}`,
        },
        body: JSON.stringify(entry),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WP napaka: ${err}`);
    }
  } catch (err) {
    console.error("[activityLog] Napaka pri pisanju:", err);
  }
}