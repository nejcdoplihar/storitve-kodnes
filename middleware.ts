import { NextRequest, NextResponse } from "next/server";

const USERNAME = process.env.DASHBOARD_USER || "admin";
const PASSWORD = process.env.DASHBOARD_PASSWORD || "geslo";

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const base64 = authHeader.split(" ")[1];
    const [user, pass] = atob(base64).split(":");
    if (user === USERNAME && pass === PASSWORD) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Dostop zavrnjen", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Dashboard"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
