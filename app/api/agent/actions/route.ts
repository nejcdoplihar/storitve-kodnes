// /api/agent/actions
//   POST — agent ustvari PREDLOG (seja ali agentov token). Ne izvede ničesar.
//   GET  — dashboard izpiše čakajoče predloge (samo seja).
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, resolveActor } from "@/lib/agentWriteAuth";
import { createAction, listActions } from "@/lib/agentActions";

export async function POST(req: NextRequest) {
  if (!(await resolveActor(req))) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }
  const { kind, endpoint, payload, summary } = await req.json();
  if (!endpoint || !summary) {
    return NextResponse.json({ error: "Manjka endpoint ali summary." }, { status: 400 });
  }
  try {
    const id = await createAction(kind || "", endpoint, payload || {}, summary);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }
  try {
    return NextResponse.json({ actions: await listActions("pending") });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
