// app/api/revalidate/route.ts
// On-demand revalidacija — kliče se iz WordPress (Webhooks plugin)
// Nastavi v WP: POST https://tvoje-spletisce.com/api/revalidate?secret=TVOJ_KLJUC

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  // Preveri skrivni ključ
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Neveljaven ključ" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // WordPress pošlje podatke o spremenjenem postu
    const { post_type, slug } = body;

    if (post_type && slug) {
      // Revalidira konkretno stran
      revalidatePath(`/cpt/${post_type}/${slug}`);
      revalidatePath(`/cpt/${post_type}`);
      revalidatePath("/");

      return NextResponse.json({
        revalidated: true,
        path: `/cpt/${post_type}/${slug}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Če ni specifičnega posta, revalidira vse
    revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: true, all: true });

  } catch (err) {
    return NextResponse.json(
      { error: "Napaka pri revalidaciji", details: String(err) },
      { status: 500 }
    );
  }
}

// GET za testiranje
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Neveljaven ključ" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, method: "GET", timestamp: new Date().toISOString() });
}
