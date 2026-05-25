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

  const body = await req.json();
  const { title, licencni_kljuc, datoteke } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Naziv licence je obvezen" }, { status: 400 });

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/licenca`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials()}` },
    body: JSON.stringify({
      title: title.trim(),
      status: "publish",
      acf: {
        licencni_kljuc: licencni_kljuc || "",
        datoteke: Array.isArray(datoteke) ? datoteke : [],
      },
    }),
  });

  const raw = await res.text();
  let data: Record<string, unknown>;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

  if (!res.ok) return NextResponse.json({ error: `WP napaka: ${JSON.stringify(data)}` }, { status: 500 });

  await logActivity({ title: title.trim(), type: "Licenca", action: "DODANO", user });

  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}
