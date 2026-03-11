import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { id, currentDate } = await req.json();

  if (!id || !currentDate) {
    return NextResponse.json({ error: "Manjka id ali datum" }, { status: 400 });
  }

  // Podaljšaj datum za 1 leto: "20260311" → "20270311"
  const newDate = String(Number(currentDate.slice(0, 4)) + 1) + currentDate.slice(4);

  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL?.replace(/\/$/, "");
  const wpUser = process.env.WP_APP_USER;
  const wpPass = process.env.WP_APP_PASSWORD;

  if (!wpUser || !wpPass) {
    return NextResponse.json({ error: "WP kredenciali niso nastavljeni" }, { status: 500 });
  }

  const credentials = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");

  const res = await fetch(`${wpUrl}/wp-json/wp/v2/stranka/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify({
      acf: { potek_storitev: newDate },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return NextResponse.json({ ok: true, newDate });
}