// app/api/opravilo/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activityLog";

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";
const credentials = () => Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const user = cookieStore.get("dashboard_auth")?.value || "neznan";
  if (!user) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Manjka id" }, { status: 400 });

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/opravilo/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${credentials()}` },
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WP napaka: ${err}` }, { status: 500 });
  }

  await logActivity({ title: `Opravilo #${id}`, type: "Opravilo", action: "IZBRISANO", user });

  return NextResponse.json({ ok: true });
}