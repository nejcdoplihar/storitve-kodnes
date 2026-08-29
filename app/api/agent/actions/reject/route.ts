// POST /api/agent/actions/reject — človek (seja) zavrne predlog; nič se ne izvede.
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/agentWriteAuth";
import { getAction, updateAction } from "@/lib/agentActions";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const { id } = await req.json();
  const action = await getAction(Number(id));
  if (!action || action.status !== "pending") {
    return NextResponse.json({ error: "Ni veljavnega predloga na čakanju." }, { status: 400 });
  }
  await updateAction(action.id, { status: "rejected", decided_by: user });
  return NextResponse.json({ ok: true });
}
