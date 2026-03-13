import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";
const credentials = () => Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

const ALLOWED_CPT = ["narocnik", "stranka", "ponudba"];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("dashboard_auth")?.value) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }

  const { id, cptSlug } = await req.json();

  if (!id || !cptSlug) {
    return NextResponse.json({ error: "Manjka id ali cptSlug" }, { status: 400 });
  }

  if (!ALLOWED_CPT.includes(cptSlug)) {
    return NextResponse.json({ error: "Brisanje ni dovoljeno za ta tip" }, { status: 403 });
  }

  // DELETE without ?force=true → moves to trash
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/${cptSlug}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${credentials()}` },
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}