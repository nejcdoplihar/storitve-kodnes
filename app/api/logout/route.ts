import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("dashboard_auth");
  cookieStore.delete("dashboard_session"); // dejansko konča sejo (middleware bere ta piškotek)
  return NextResponse.json({ ok: true });
}