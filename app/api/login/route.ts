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

  const inputUser = String(username || "").trim();
  const inputPass = String(password || "").trim();

  const validUser = String(process.env.DASHBOARD_USER || "admin").trim();
  const validPass = String(process.env.DASHBOARD_PASSWORD || "geslo").trim();
  const validUser2 = String(process.env.DASHBOARD_USER2 || "").trim();
  const validPass2 = String(process.env.DASHBOARD_PASSWORD2 || "").trim();
  console.log({
    validUser,
    validUser2,
    hasPass1: !!validPass,
    hasPass2: !!validPass2,
  });
  const ok =
    (inputUser === validUser && inputPass === validPass) ||
    (validUser2 && inputUser === validUser2 && inputPass === validPass2);

  if (ok) {
    attempts.delete(ip);
    const cookieStore = await cookies();
    cookieStore.set("dashboard_auth", inputUser, {
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