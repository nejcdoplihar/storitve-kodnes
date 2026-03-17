import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";

// Rate limiting — v spominu (se resetira ob redeploy, dovolj za manjši dashboard)
const attempts = new Map<string, { count: number; time: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // ── Rate limiting: max 5 poskusov na 15 minut ──
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && now - record.time < 15 * 60 * 1000) {
    if (record.count >= 5) {
      const waitMin = Math.ceil((15 * 60 * 1000 - (now - record.time)) / 60000);
      return NextResponse.json(
        { error: `Preveč poskusov. Počakaj ${waitMin} minut.` },
        { status: 429 }
      );
    }
    record.count++;
  } else {
    attempts.set(ip, { count: 1, time: now });
  }

  const { username, password, rememberMe } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Manjka uporabniško ime ali geslo." }, { status: 400 });
  }

  // ── Preveri credentials prek WordPress ──
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  let wpUser: { name?: string; slug?: string; roles?: string[] } | null = null;

  try {
    const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${credentials}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Napačno uporabniško ime ali geslo." },
        { status: 401 }
      );
    }

    wpUser = await res.json();
  } catch {
    return NextResponse.json(
      { error: "Napaka pri povezavi s strežnikom." },
      { status: 500 }
    );
  }

  // ── Uspešna prijava ──
  attempts.delete(ip);

  const cookieStore = await cookies();
  cookieStore.set("dashboard_auth", wpUser?.slug || username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ ok: true, user: wpUser?.name || username });
}