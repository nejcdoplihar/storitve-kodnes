// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-32chars-minimum!";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dashboard_session")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      id: number;
      username: string;
      name: string;
      email: string;
      position: string;
      avatarUrl: string;
      wpCredentials: string;
    };
  } catch {
    return null;
  }
}

// GET — vrni profil podatke
export async function GET() {
  const session = await getSession();

  if (!session) {
    // Fallback na stari cookie če session ne obstaja
    const cookieStore = await cookies();
    const username = cookieStore.get("dashboard_auth")?.value || "";
    if (!username) return NextResponse.json({ error: "Ni prijave." }, { status: 401 });
    return NextResponse.json({
      username,
      profile: { fullName: username, email: "", position: "", avatarUrl: "" },
    });
  }

  return NextResponse.json({
    username: session.username,
    profile: {
      fullName: session.name,
      email: session.email,
      position: session.position,
      avatarUrl: session.avatarUrl,
    },
  });
}

// POST — shrani profil v WP user meta
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ni prijave." }, { status: 401 });

  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const position = String(body.position || "").trim();
  const avatarUrl = String(body.avatarUrl || "").trim();

  if (!fullName) return NextResponse.json({ error: "Ime in priimek je obvezno." }, { status: 400 });

  const res = await fetch(
    `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/users/${session.id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${session.wpCredentials}`,
      },
      body: JSON.stringify({
        name: fullName,
        email: email || undefined,
        meta: {
          kodnes_position: position,
          kodnes_avatar_url: avatarUrl,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}