// POST /api/agent/actions/apply — človek (seja) potrdi predlog; izvede se pravi
// zapis prek ciljne poti z AGENT_WRITE_TOKEN (strežniško). Human-in-the-loop.
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/agentWriteAuth";
import { getAction, updateAction } from "@/lib/agentActions";

const WRITE_TOKEN = process.env.AGENT_WRITE_TOKEN || "";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const { id } = await req.json();
  const action = await getAction(Number(id));
  if (!action) return NextResponse.json({ error: "Predlog ne obstaja." }, { status: 404 });
  if (action.status !== "pending") {
    return NextResponse.json({ error: `Predlog je že ${action.status}.` }, { status: 400 });
  }

  try {
    const res = await fetch(`${req.nextUrl.origin}${action.endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WRITE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(action.payload),
    });
    const body = (await res.text()).slice(0, 300);
    if (!res.ok) {
      await updateAction(action.id, { status: "failed", result: body, decided_by: user });
      return NextResponse.json({ error: body }, { status: 502 });
    }
    await updateAction(action.id, { status: "applied", result: body, decided_by: user });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await updateAction(action.id, { status: "failed", result: String(e).slice(0, 300), decided_by: user });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
