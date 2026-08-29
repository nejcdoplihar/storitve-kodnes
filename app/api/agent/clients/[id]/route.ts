// GET /api/agent/clients/:id  — ena stranka + povezana opravila in ponudbe
import { NextRequest, NextResponse } from "next/server";
import { agentAuthorized, unauthorized } from "@/lib/agentAuth";
import { getAllCPT, parseStranka, parseOpravilo, parsePonudba } from "@/lib/agentData";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!agentAuthorized(req)) return unauthorized();
  const { id } = await params;
  const cid = Number(id);
  if (Number.isNaN(cid)) {
    return NextResponse.json({ error: "Neveljaven id." }, { status: 400 });
  }

  const stranka = (await getAllCPT("stranka")).find((s) => s.id === cid);
  if (!stranka) {
    return NextResponse.json({ error: "Stranka ne obstaja." }, { status: 404 });
  }

  const tasks = (await getAllCPT("opravilo"))
    .map(parseOpravilo)
    .filter((o) => o.stranka_rel.includes(cid));

  const offers = (await getAllCPT("ponudba"))
    .map(parsePonudba)
    .filter((p) =>
      Array.isArray(p.stranka_rel) ? p.stranka_rel.includes(cid) : p.stranka_rel === cid
    );

  return NextResponse.json({ client: parseStranka(stranka), tasks, offers });
}
