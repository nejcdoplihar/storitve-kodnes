import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  // Preveri PODPISANI sejni JWT — ne le prisotnost piškotka.
  const session = await verifySession(request.cookies.get("dashboard_session")?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
