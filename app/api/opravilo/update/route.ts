import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "";
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("dashboard_auth")?.value;
  if (!auth) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const { ids, placano } = await req.json();
  // ids: number[] — seznam ID-jev za posodobitev

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Manjkajo ID-ji" }, { status: 400 });
  }

  const credentials = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

  const results = await Promise.allSettled(
    ids.map((id: number) =>
      fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ acf: { placano: !!placano } }),
      })
    )
  );

  const failed = results.filter(r => r.status === "rejected").length;
  return NextResponse.json({ ok: true, updated: ids.length - failed, failed });
}