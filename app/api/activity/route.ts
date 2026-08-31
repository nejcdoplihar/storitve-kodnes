import { NextRequest, NextResponse } from "next/server";
import { readLog } from "@/lib/activityLog";
import { getSessionUser } from "@/lib/agentWriteAuth";

export async function GET(req: NextRequest) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }

  
  const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
  const entries = await readLog(limit);

  return NextResponse.json({ entries });
}
