// app/api/narocnik/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activityLog";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";
const credentials = () => Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const user = cookieStore.get("dashboard_auth")?.value || "neznan";
  if (!user) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const body = await req.json();
  const {
    id,
    title,
    narocnik_kontaktna_oseba,
    narocnik_email,
    narocnik_telefonska_stevilka,
    narocnik_naslov,
    narocnik_postna_stevilka,
    narocnik_posta,
    narocnik_davcna_stevilka,
  } = body;

  if (!id) return NextResponse.json({ error: "Manjka id" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "Naziv naročnika je obvezen" }, { status: 400 });

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/narocnik/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials()}`,
    },
    body: JSON.stringify({
      title: title.trim(),
      acf: {
        narocnik_naziv: title.trim(),
        narocnik_kontaktna_oseba: narocnik_kontaktna_oseba || "",
        narocnik_email: narocnik_email || "",
        narocnik_telefonska_stevilka: narocnik_telefonska_stevilka || "",
        narocnik_naslov: narocnik_naslov || "",
        narocnik_postna_stevilka: narocnik_postna_stevilka || "",
        narocnik_posta: narocnik_posta || "",
        narocnik_davcna_stevilka: narocnik_davcna_stevilka || "",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  await logActivity({
    title: String(title).trim(),
    type: "Naročnik",
    action: "UREJENO",
    user,
  });

  return NextResponse.json({ ok: true });
}