// GET /api/agent/clients?search=  — seznam strank (razčlenjene storitve + finance)
import { NextRequest, NextResponse } from "next/server";
import { agentAuthorized, unauthorized } from "@/lib/agentAuth";
import { getAllCPT, parseStranka } from "@/lib/agentData";

export async function GET(req: NextRequest) {
  if (!agentAuthorized(req)) return unauthorized();
  const search = (req.nextUrl.searchParams.get("search") || "").toLowerCase().trim();
  const rows = (await getAllCPT("stranka")).map(parseStranka);
  const clients = search
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          (r.domain || "").toLowerCase().includes(search)
      )
    : rows;
  return NextResponse.json({ count: clients.length, clients });
}
