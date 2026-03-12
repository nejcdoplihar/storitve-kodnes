import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const username = cookieStore.get("dashboard_auth")?.value || "";
  return NextResponse.json({ username });
}