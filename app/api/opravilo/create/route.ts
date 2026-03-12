import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";

export async function POST(req: NextRequest) {
  // Preveri prijavo
  const cookieStore = await cookies();
  const auth = cookieStore.get("dashboard_auth")?.value;
  if (!auth) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const body = await req.json();
  const {
    datum_opravila,
    uporabnik,
    naslov_opravila,
    opis_opravila,
    cas_ure,
    custom_postavka,
    urna_postavka,
    stranka_id, // WP post ID stranke
    placano,
  } = body;

  if (!naslov_opravila || !stranka_id) {
    return NextResponse.json({ error: "Manjka naslov ali stranka" }, { status: 400 });
  }

  const credentials = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

  // Ustvari WP post
  const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      title: naslov_opravila,
      status: "publish",
      acf: {
        datum_opravila,
        uporabnik,
        naslov_opravila,
        opis_opravila,
        cas_ure: parseFloat(cas_ure),
        custom_postavka: custom_postavka || false,
        urna_postavka: custom_postavka ? parseFloat(urna_postavka) : 35,
        stranka_rel: [stranka_id],
        placano: placano || false,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, id: data.id });
}