import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";

const credentials = () =>
  Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  if (!cookieStore.get("dashboard_auth")?.value) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      datum_opravila,
      uporabnik,
      naslov_opravila,
      opis_opravila,
      cas_ure,
      custom_postavka,
      urna_postavka,
      stranka_id,
      narocnik_id,
      placano,
    } = body;

    if (!naslov_opravila || !String(naslov_opravila).trim()) {
      return NextResponse.json({ error: "Naslov je obvezen." }, { status: 400 });
    }

    const hasStranka = !!stranka_id && !Number.isNaN(Number(stranka_id));
    const hasNarocnik = !!narocnik_id && !Number.isNaN(Number(narocnik_id));

    if (!hasStranka && !hasNarocnik) {
      return NextResponse.json(
        { error: "Izberi stranko ali naročnika." },
        { status: 400 }
      );
    }

    // 1) ustvari post brez acf
    const createRes = await fetch(`${WP_URL}/wp-json/wp/v2/opravilo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials()}`,
      },
      body: JSON.stringify({
        title: String(naslov_opravila).trim(),
        status: "publish",
      }),
    });

    const createRaw = await createRes.text();

    let createData: any = {};
    try {
      createData = createRaw ? JSON.parse(createRaw) : {};
    } catch {
      createData = { error: createRaw || "Neveljaven odgovor WP pri ustvarjanju." };
    }

    if (!createRes.ok || !createData?.id) {
      return NextResponse.json(
        { error: createData?.message || createData?.error || "Napaka pri ustvarjanju opravila." },
        { status: 500 }
      );
    }

    const opraviloId = createData.id;

    // 2) nato posodobi ACF
    const acfPayload: Record<string, unknown> = {
      datum_opravila: datum_opravila || "",
      uporabnik: uporabnik || "",
      naslov_opravila: naslov_opravila || "",
      opis_opravila: opis_opravila || "",
      cas_ure: cas_ure !== undefined ? Number(cas_ure) : 0,
      custom_postavka: Boolean(custom_postavka),
      urna_postavka: urna_postavka ? Number(urna_postavka) : 35,
      placano: Boolean(placano),
    };

    // Relationship polja pošlji samo če imajo vrednost (WP vrže napako za prazen array)
    if (hasStranka) acfPayload.stranka_rel = [Number(stranka_id)];
    if (hasNarocnik) acfPayload.narocnik_rel = [Number(narocnik_id)];

    const updateRes = await fetch(`${WP_URL}/wp-json/wp/v2/opravilo/${opraviloId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials()}`,
      },
      body: JSON.stringify({ acf: acfPayload }),
    });

    const updateRaw = await updateRes.text();

    let updateData: any = {};
    try {
      updateData = updateRaw ? JSON.parse(updateRaw) : {};
    } catch {
      updateData = { error: updateRaw || "Neveljaven odgovor WP pri ACF update-u." };
    }

    if (!updateRes.ok) {
      return NextResponse.json(
        {
          error:
            updateData?.message ||
            updateData?.error ||
            "Opravilo je ustvarjeno, ACF podatki pa se niso shranili.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: opraviloId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Napaka pri ustvarjanju opravila",
      },
      { status: 500 }
    );
  }
}