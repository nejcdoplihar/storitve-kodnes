// lib/agentWriteAuth.ts
// Avtorizacija za pisalne poti: dovoli obstoječo dashboard sejo ALI AI-agenta z
// LOČENIM pisalnim tokenom (AGENT_WRITE_TOKEN). Vrne ime akterja za avdit, ali null.
// Agent pisalni token je namenoma ločen od bralnega (AGENT_API_TOKEN).

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { verifySession } from "./session";

// Samo dashboard seja (BREZ agentovega tokena) — za uporabniške/občutljive poti
// (profil, geslo, mediji), kjer agent NE sme imeti dostopa.
export async function getSessionUser(): Promise<string | null> {
  const store = await cookies();
  const session = await verifySession(store.get("dashboard_session")?.value);
  return session?.username ?? null;
}

export async function resolveActor(req: NextRequest): Promise<string | null> {
  // 1) Dashboard uporabnik — preveri PODPISANI sejni JWT (ne le prisotnost).
  const store = await cookies();
  const session = await verifySession(store.get("dashboard_session")?.value);
  if (session?.username) return session.username;

  // 2) AI agent (Bearer AGENT_WRITE_TOKEN)
  const token = process.env.AGENT_WRITE_TOKEN;
  if (!token) return null;
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? "AI agent" : null;
}
