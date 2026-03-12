import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const username = cookieStore.get("dashboard_auth")?.value || "";

  if (!username) {
    return NextResponse.json({ error: "Ni prijave." }, { status: 401 });
  }

  const body = await req.json();
  const currentPassword = String(body.currentPassword || "").trim();
  const newPassword = String(body.newPassword || "").trim();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Manjkajo podatki." }, { status: 400 });
  }

  return NextResponse.json(
    {
      error: "Sprememba gesla še ni aktivna, ker trenutni login uporablja .env uporabnike. Za to morava najprej prenesti prijavo v bazo ali WordPress userje.",
    },
    { status: 400 }
  );
}