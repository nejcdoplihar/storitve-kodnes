// lib/agentAuth.ts
// Ločena avtentikacija za AI-agenta (servisni Bearer token, ne dashboard piškotek).
// Nastavi AGENT_API_TOKEN v .env.local. Endpointi pod /api/agent/* so SAMO BRALNI.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export function agentAuthorized(req: NextRequest): boolean {
  const token = process.env.AGENT_API_TOKEN;
  if (!token) return false; // brez tokena je agent API onemogočen
  const header = req.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(token);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Neveljaven ali manjkajoč AGENT_API_TOKEN." },
    { status: 401 }
  );
}
