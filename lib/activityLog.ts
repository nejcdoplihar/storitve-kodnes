// lib/activityLog.ts
// Serverska funkcija za beleženje aktivnosti v /data/activity-log.json
// Kličemo jo samo iz API route-ov (server-side)

import fs from "fs";
import path from "path";

export type ActivityAction = "DODANO" | "UREJENO" | "IZBRISANO" | "PODALJŠANO";

export type ActivityEntry = {
  id: string;           // unikaten ID: timestamp + random
  title: string;        // naziv zapisa (npr. "Safir", "Ponudba #12")
  type: string;         // tip vsebine (npr. "Stranka", "Naročnik", "Ponudba", "Opravilo")
  action: ActivityAction;
  user: string;         // uporabniško ime iz cookie
  timestamp: string;    // ISO string
};

const LOG_PATH = path.join(process.cwd(), "data", "activity-log.json");
const MAX_ENTRIES = 200;

function ensureFile() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "[]", "utf-8");
}

export function readLog(): ActivityEntry[] {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(LOG_PATH, "utf-8")) as ActivityEntry[];
  } catch {
    return [];
  }
}

export function logActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
  try {
    ensureFile();
    const existing = readLog();
    const newEntry: ActivityEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    // Dodamo na vrh, omejimo na MAX_ENTRIES
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    fs.writeFileSync(LOG_PATH, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    // Log napake ne sme prekiniti glavne operacije
    console.error("[activityLog] Napaka pri pisanju loga:", err);
  }
}
