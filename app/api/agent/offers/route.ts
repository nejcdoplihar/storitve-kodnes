// GET /api/agent/offers  — ponudbe
import { NextRequest, NextResponse } from "next/server";
import { agentAuthorized, unauthorized } from "@/lib/agentAuth";
import { getAllCPT, parsePonudba } from "@/lib/agentData";

export async function GET(req: NextRequest) {
  if (!agentAuthorized(req)) return unauthorized();
  const offers = (await getAllCPT("ponudba")).map(parsePonudba);
  return NextResponse.json({ count: offers.length, offers });
}
