import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activityLog";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const user = cookieStore.get("dashboard_auth")?.value || "neznan";
  if (!user) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const body = await req.json();
  const {
    id,
    naslov_opravila,
    datum_opravila,
    uporabnik,
    opis_opravila,
    cas_ure,
    custom_postavka,
    urna_postavka,
    stranka_id,
    placano,
  } = body;

  if (!id) return NextResponse.json({ error: "Manjka id" }, { status: 400 });
  if (!naslov_opravila) return NextResponse.json({ error: "Naslov opravila je obvezen" }, { status: 400 });

  const credentials = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

  const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      title: naslov_opravila,
      acf: {
        datum_opravila: datum_opravila || "",
        uporabnik: uporabnik || "",
        naslov_opravila,
        opis_opravila: opis_opravila || "",
        cas_ure: parseFloat(cas_ure) || 0,
        custom_postavka: custom_postavka || false,
        urna_postavka: custom_postavka ? parseFloat(urna_postavka) : 35,
        stranka_rel: stranka_id ? [stranka_id] : [],
        placano: placano || false,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  logActivity({
    title: String(naslov_opravila).trim(),
    type: "Opravilo",
    action: "UREJENO",
    user,
  });

  return NextResponse.json({ ok: true });
}
