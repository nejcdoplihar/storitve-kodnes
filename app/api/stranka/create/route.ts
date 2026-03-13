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
      title,
      storitve,
      domena_url,
      potek_storitev,
      stanje_storitve,
      strosek,
      strosek_obracun,
      opombe,
      logo_id,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { error: "Naziv stranke je obvezen" },
        { status: 400 }
      );
    }

    const wpPayload = {
      title: String(title).trim(),
      status: "publish",
      ...(logo_id ? { featured_media: Number(logo_id) } : {}),
      acf: {
        storitve: Array.isArray(storitve) ? storitve : [],
        domena_url: domena_url || "",
        potek_storitev: potek_storitev || "",
        stanje_storitve: Boolean(stanje_storitve),
        strosek: strosek ? Number(strosek) : 0,
        strosek_obracun: Array.isArray(strosek_obracun)
          ? strosek_obracun
          : [],
        opombe: opombe || "",
      },
    };

    const res = await fetch(`${WP_URL}/wp-json/wp/v2/stranka`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials()}`,
      },
      body: JSON.stringify(wpPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `WP napaka: ${err}` },
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      id: data.id,
      slug: data.slug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Neznana napaka pri ustvarjanju stranke",
      },
      { status: 500 }
    );
  }
}