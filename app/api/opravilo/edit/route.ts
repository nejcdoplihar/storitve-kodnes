import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activityLog";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";


export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const user = cookieStore.get("dashboard_auth")?.value || "neznan";

  if (!user) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }

  try {
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
    narocnik_id,
    stranka_id,
    placano,
    clear_narocnik_rel,
    clear_stranka_rel,
  } = body;

    if (!id) {
      return NextResponse.json({ error: "Manjka id" }, { status: 400 });
    }

    if (!naslov_opravila || !String(naslov_opravila).trim()) {
      return NextResponse.json(
        { error: "Naslov opravila je obvezen" },
        { status: 400 }
      );
    }

    const credentials = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

    const hasNarocnik =
      narocnik_id !== null &&
      narocnik_id !== undefined &&
      narocnik_id !== "" &&
      !Number.isNaN(Number(narocnik_id));

    const hasStranka =
      stranka_id !== null &&
      stranka_id !== undefined &&
      stranka_id !== "" &&
      !Number.isNaN(Number(stranka_id));

    const acfPayload: Record<string, unknown> = {
      datum_opravila: datum_opravila || "",
      uporabnik: uporabnik || "",
      naslov_opravila,
      opis_opravila: opis_opravila || "",
      cas_ure: parseFloat(cas_ure) || 0,
      custom_postavka: custom_postavka || false,
      urna_postavka: custom_postavka ? parseFloat(urna_postavka) : 35,
      placano: placano || false,
    };
    
    if (clear_narocnik_rel) {
      acfPayload.narocnik_rel = [];
    } else if (narocnik_id) {
      acfPayload.narocnik_rel = [Number(narocnik_id)];
    }

    if (clear_stranka_rel) {
      acfPayload.stranka_rel = [];
    } else if (stranka_id) {
      acfPayload.stranka_rel = [Number(stranka_id)];
    }
    // relationship polja dodaj samo, če obstajajo
    if (hasNarocnik) {
      acfPayload.narocnik_rel = [Number(narocnik_id)];
    }

    if (hasStranka) {
      acfPayload.stranka_rel = [Number(stranka_id)];
    }

    const res = await fetch(
      `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          title: naslov_opravila,
          acf: acfPayload,
        }),
      }
    );

    const raw = await res.text();

    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw || "Neveljaven odgovor WordPressa." };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `WP napaka: ${data?.message || data?.error || raw}`,
        },
        { status: 500 }
      );
    }

    logActivity({
      title: String(naslov_opravila).trim(),
      type: "Opravilo",
      action: "UREJENO",
      user,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Napaka pri urejanju opravila",
      },
      { status: 500 }
    );
  }
}