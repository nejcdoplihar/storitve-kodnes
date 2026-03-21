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

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Manjkajo ID-ji" }, { status: 400 });
  }

  const credentials = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

  // ACF true_false polje pričakuje 1 ali 0 (ne true/false)
  const placanoValue = placano ? 1 : 0;

  const results = await Promise.allSettled(
    ids.map(async (id: number) => {
      const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ acf: { placano: placanoValue } }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[opravilo/update] WP napaka za ID ${id}: ${res.status} ${errText}`);
        throw new Error(`WP ${res.status}: ${errText}`);
      }

      return res.json();
    })
  );

  const failed = results.filter(r => r.status === "rejected");
  const errors = failed.map(r => (r as PromiseRejectedResult).reason?.message || "Napaka");

  if (failed.length > 0) {
    console.error(`[opravilo/update] ${failed.length}/${ids.length} neuspešnih:`, errors);
    return NextResponse.json({
      ok: false,
      updated: ids.length - failed.length,
      failed: failed.length,
      errors,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: ids.length, failed: 0 });
}