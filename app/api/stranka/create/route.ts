import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";
const credentials = () => Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("dashboard_auth")?.value) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }

  const body = await req.json();
  const { id, fields } = body;
  // fields: Partial<{ stanje_storitve, potek_storitev, strosek, strosek_obracun, domena_url, opombe, storitve }>

  if (!id) return NextResponse.json({ error: "Manjka ID" }, { status: 400 });

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/stranka/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials()}`,
    },
    body: JSON.stringify({ acf: fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}