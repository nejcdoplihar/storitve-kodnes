import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activityLog";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";

const credentials = () =>
  Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const user = cookieStore.get("dashboard_auth")?.value || "neznan";
  if (!user) {
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
      stanje_vzdrzevanja,
      strosek,
      strosek_obracun,
      opombe,
      logo_id,
      narocnik_id,
      clear_narocnik_rel,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { error: "Naziv stranke je obvezen" },
        { status: 400 }
      );
    }

    const hasNarocnik =
      narocnik_id !== null &&
      narocnik_id !== undefined &&
      narocnik_id !== "" &&
      !Number.isNaN(Number(narocnik_id));

    const acfPayload: Record<string, unknown> = {
      storitve: Array.isArray(storitve) ? storitve : [],
      domena_url: domena_url || "",
      potek_storitev: potek_storitev || "",
      stanje_storitve: Boolean(stanje_storitve),
      stanje_vzdrzevanja: Boolean(stanje_vzdrzevanja),
      strosek:
        strosek !== "" && strosek !== null && strosek !== undefined
          ? Number(strosek)
          : 0,
      strosek_obracun: Array.isArray(strosek_obracun)
        ? strosek_obracun
        : [],
      opombe: opombe || "",
    };

    if (clear_narocnik_rel) {
      acfPayload.narocnik_rel = false;
    } else if (hasNarocnik) {
      acfPayload.narocnik_rel = [Number(narocnik_id)];
    }

    const wpPayload = {
      title: String(title).trim(),
      status: "publish",
      ...(logo_id ? { featured_media: Number(logo_id) } : {}),
      acf: acfPayload,
    };

    const res = await fetch(`${WP_URL}/wp-json/wp/v2/stranka`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials()}`,
      },
      body: JSON.stringify(wpPayload),
    });

    const raw = await res.text();

    let data: any;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = raw;
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `WP napaka: ${
            typeof data === "string" ? data : JSON.stringify(data)
          }`,
        },
        { status: 500 }
      );
    }

    logActivity({
      title: String(title).trim(),
      type: "Stranka",
      action: "DODANO",
      user,
    });

    return NextResponse.json({
      ok: true,
      id: data.id,
      slug: data.slug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Neznana napaka pri ustvarjanju stranke",
      },
      { status: 500 }
    );
  }
}