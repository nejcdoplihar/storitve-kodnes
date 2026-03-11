import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  
  const validUser = process.env.DASHBOARD_USER || "admin";
  const validPass = process.env.DASHBOARD_PASSWORD || "geslo";
  
  console.log("Prejeto:", username, password);
  console.log("Pričakovano:", validUser, validPass);
  
  if (username === validUser && password === validPass) {
    const cookieStore = await cookies();
    cookieStore.set("dashboard_auth", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dni
      path: "/",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Napačni podatki" }, { status: 401 });
}