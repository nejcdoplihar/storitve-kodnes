// GET /api/agent/services/expiring?days=30  — storitve pred potekom (prihajajoče)
import { NextRequest, NextResponse } from "next/server";
import { agentAuthorized, unauthorized } from "@/lib/agentAuth";
import { expiringServices } from "@/lib/agentReports";

export async function GET(req: NextRequest) {
  if (!agentAuthorized(req)) return unauthorized();
  const days = Number(req.nextUrl.searchParams.get("days") || "30");
  const services = await expiringServices(days);
  return NextResponse.json({ days, count: services.length, services });
}
