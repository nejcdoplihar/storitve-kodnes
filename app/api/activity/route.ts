import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readLog } from "@/lib/activityLog";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("dashboard_auth")?.value) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
  const entries = readLog().slice(0, limit);

  return NextResponse.json({ entries });
}
