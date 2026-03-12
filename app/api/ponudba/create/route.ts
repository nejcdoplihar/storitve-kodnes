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
  const { title, znesek, status_ponudbe, veljavnost, stranka_id } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Naziv ponudbe je obvezen" }, { status: 400 });
  }

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/ponudba`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials()}`,
    },
    body: JSON.stringify({
      title,
      status: "publish",
      acf: {
        znesek: znesek ? parseFloat(znesek) : 0,
        status_ponudbe: status_ponudbe || "v_obdelavi",
        veljavnost: veljavnost || "",
        stranka_rel: stranka_id ? [stranka_id] : [],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}