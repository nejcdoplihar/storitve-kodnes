import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

function verifySessionToken(token: string): boolean {
  try {
    const secret = process.env.SESSION_SECRET || "fallback-secret-change-this";
    const parts = token.split(":");
    if (parts.length !== 2) return false;
    const [timestamp, hash] = parts;
    if (!timestamp || !hash) return false;

    // Token velja 7 dni
    const tokenAge = Date.now() - parseInt(timestamp);
    if (isNaN(tokenAge) || tokenAge > 7 * 24 * 60 * 60 * 1000) return false;

    // Preveri HMAC za vse možne uporabnike
    const users = [
      process.env.DASHBOARD_USER,
      process.env.DASHBOARD_USER2,
    ].filter(Boolean);

    for (const username of users) {
      const hmac = createHmac("sha256", secret);
      hmac.update(`${username}:${timestamp}`);
      const expectedHash = hmac.digest("hex");
      try {
        const bufExpected = Buffer.from(expectedHash, "hex");
        const bufActual = Buffer.from(hash, "hex");
        if (bufExpected.length === bufActual.length && timingSafeEqual(bufExpected, bufActual)) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("dashboard_auth")?.value;

  if (!token || !verifySessionToken(token)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};