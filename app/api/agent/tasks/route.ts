// GET /api/agent/tasks?paid=false  — opravila (neobvezno filtriraj po plačanem)
import { NextRequest, NextResponse } from "next/server";
import { agentAuthorized, unauthorized } from "@/lib/agentAuth";
import { getAllCPT, parseOpravilo } from "@/lib/agentData";

export async function GET(req: NextRequest) {
  if (!agentAuthorized(req)) return unauthorized();
  const paid = req.nextUrl.searchParams.get("paid"); // "true" | "false" | null
  let tasks = (await getAllCPT("opravilo")).map(parseOpravilo);
  if (paid === "true") tasks = tasks.filter((t) => t.paid);
  if (paid === "false") tasks = tasks.filter((t) => !t.paid);
  return NextResponse.json({ count: tasks.length, tasks });
}
