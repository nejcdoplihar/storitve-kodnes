import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const attempts = new Map<string, { count: number; time: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const now = Date.now();
  const record = attempts.get(ip);
  if (record && now - record.time < 15 * 60 * 1000) {
    if (record.count >= 5) {
      const waitMin = Math.ceil((15 * 60 * 1000 - (now - record.time)) / 60000);
      return NextResponse.json({ error: `Preveč poskusov. Počakaj ${waitMin} minut.` }, { status: 429 });
    }
    record.count++;
  } else {
    attempts.set(ip, { count: 1, time: now });
  }

  const { username, password, rememberMe } = await req.json();

  const validUser = process.env.DASHBOARD_USER || "admin";
  const validPass = process.env.DASHBOARD_PASSWORD || "geslo";
  const validUser2 = process.env.DASHBOARD_USER2 || "";
  const validPass2 = process.env.DASHBOARD_PASSWORD2 || "";

  const ok =
    (username === validUser && password === validPass) ||
    (validUser2 && username === validUser2 && password === validPass2);

  if (ok) {
    attempts.delete(ip);
    const cookieStore = await cookies();
    cookieStore.set("dashboard_auth", username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
      path: "/",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Napačno uporabniško ime ali geslo." }, { status: 401 });
}