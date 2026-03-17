// app/api/profile/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-32chars-minimum!";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dashboard_session")?.value;
  if (!token) return NextResponse.json({ error: "Ni prijave." }, { status: 401 });

  let session: { id: number; username: string; wpCredentials: string };
  try {
    const secret = new TextEncoder().encode(SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    session = payload as typeof session;
  } catch {
    return NextResponse.json({ error: "Neveljavna seja." }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Manjkajo podatki." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Novo geslo mora imeti vsaj 8 znakov." }, { status: 400 });
  }

  // Preveri trenutno geslo
  const checkRes = await fetch(
    `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/users/me`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${session.username}:${currentPassword}`).toString("base64")}`,
      },
      cache: "no-store",
    }
  );

  if (!checkRes.ok) {
    return NextResponse.json({ error: "Trenutno geslo je napačno." }, { status: 401 });
  }

  // Nastavi novo geslo prek WP
  const updateRes = await fetch(
    `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/users/${session.id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${session.wpCredentials}`,
      },
      body: JSON.stringify({ password: newPassword }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  // Odjavi uporabnika — mora se prijaviti z novim geslom
  cookieStore.delete("dashboard_auth");
  cookieStore.delete("dashboard_session");

  return NextResponse.json({ ok: true, logout: true });
}