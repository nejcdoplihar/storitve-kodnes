// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-32chars-minimum!";

const attempts = new Map<string, { count: number; time: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting
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

  if (!username || !password) {
    return NextResponse.json({ error: "Manjka uporabniško ime ali geslo." }, { status: 400 });
  }

  // Preveri credentials prek WP
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  let wpUser: {
    id: number;
    slug: string;
    name: string;
    email?: string;
    meta?: { kodnes_position?: string[]; kodnes_avatar_url?: string[] };
  };

  try {
    const res = await fetch(
      `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/users/me?context=edit`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Napačno uporabniško ime ali geslo." }, { status: 401 });
    }

    wpUser = await res.json();
  } catch {
    return NextResponse.json({ error: "Napaka pri povezavi s strežnikom." }, { status: 500 });
  }

  attempts.delete(ip);

  // Ustvari JWT session token z user podatki + credentials za WP klice
  const secret = new TextEncoder().encode(SESSION_SECRET);
  const token = await new SignJWT({
    id: wpUser.id,
    username: wpUser.slug,
    name: wpUser.name,
    email: wpUser.email || "",
    position: wpUser.meta?.kodnes_position?.[0] || "",
    avatarUrl: wpUser.meta?.kodnes_avatar_url?.[0] || "",
    // Shranjujemo credentials za server-side WP klice (httpOnly cookie — varen)
    wpCredentials: credentials,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(rememberMe ? "30d" : "7d")
    .sign(secret);

  const cookieStore = await cookies();

  // Stari cookie za kompatibilnost (middleware ga bere)
  cookieStore.set("dashboard_auth", wpUser.slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
    path: "/",
  });

  // Nov session cookie z vsemi podatki
  cookieStore.set("dashboard_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ ok: true, user: wpUser.name });
}