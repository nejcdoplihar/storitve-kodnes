// GET /api/agent/finance/summary  — finančni pregled (ponavljajoči prihodek + razrezi)
import { NextRequest, NextResponse } from "next/server";
import { agentAuthorized, unauthorized } from "@/lib/agentAuth";
import { financeSummary } from "@/lib/agentReports";

export async function GET(req: NextRequest) {
  if (!agentAuthorized(req)) return unauthorized();
  return NextResponse.json(await financeSummary());
}
