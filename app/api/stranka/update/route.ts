import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
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
      id,
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

    if (!id) {
      return NextResponse.json({ error: "Manjka ID" }, { status: 400 });
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
          : "",
      strosek_obracun: Array.isArray(strosek_obracun) ? strosek_obracun : [],
      opombe: opombe || "",
    };

    if (clear_narocnik_rel) {
      acfPayload.narocnik_rel = false;
    } else if (hasNarocnik) {
      acfPayload.narocnik_rel = [Number(narocnik_id)];
    }

    const wpPayload = {
      ...(title ? { title: String(title).trim() } : {}),
      ...(logo_id !== undefined
        ? { featured_media: logo_id ? Number(logo_id) : 0 }
        : {}),
      acf: acfPayload,
    };

    const wpRes = await fetch(`${WP_URL}/wp-json/wp/v2/stranka/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials()}`,
      },
      body: JSON.stringify(wpPayload),
      cache: "no-store",
    });

    const raw = await wpRes.text();

    let wpData: any;
    try {
      wpData = JSON.parse(raw);
    } catch {
      wpData = raw;
    }

    if (!wpRes.ok) {
      return NextResponse.json(
        {
          error: `WP napaka: ${
            typeof wpData === "string" ? wpData : JSON.stringify(wpData)
          }`,
        },
        { status: 500 }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/cpt/stranka");

    if (wpData?.slug) {
      revalidatePath(`/cpt/stranka/${wpData.slug}`);
    }

    logActivity({
      title: title ? String(title).trim() : `Stranka #${id}`,
      type: "Stranka",
      action: "UREJENO",
      user,
    });

    return NextResponse.json({
      ok: true,
      id: wpData?.id,
      slug: wpData?.slug,
      wpData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Napaka pri urejanju stranke",
      },
      { status: 500 }
    );
  }
}