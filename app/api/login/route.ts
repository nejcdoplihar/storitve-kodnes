import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

// Uporabniki so definirani v environment variables
// Format: USER1_NAME=nejc, USER1_PASS=geslo, USER2_NAME=..., USER2_PASS=...
const USERS = [
  {
    username: process.env.DASHBOARD_USER || "",
    password: process.env.DASHBOARD_PASSWORD || "",
  },
  {
    username: process.env.DASHBOARD_USER2 || "",
    password: process.env.DASHBOARD_PASSWORD2 || "",
  },
].filter((u) => u.username && u.password); // Ignoriraj prazne

// Timing-safe primerjava (prepreči timing attacks)
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      // Še vedno izvedi primerjavo da preprečimo timing leak
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Generiraj session token
function generateSessionToken(username: string): string {
  const secret = process.env.SESSION_SECRET || "fallback-secret-change-this";
  const timestamp = Date.now().toString();
  const hmac = createHmac("sha256", secret);
  hmac.update(`${username}:${timestamp}`);
  return `${timestamp}:${hmac.digest("hex")}`;
}

// Preveri session token
export function verifySessionToken(token: string): boolean {
  try {
    const secret = process.env.SESSION_SECRET || "fallback-secret-change-this";
    const [timestamp, hash] = token.split(":");
    if (!timestamp || !hash) return false;

    // Token velja 7 dni
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 7 * 24 * 60 * 60 * 1000) return false;

    // Preveri HMAC za vse uporabnike
    for (const user of USERS) {
      const hmac = createHmac("sha256", secret);
      hmac.update(`${user.username}:${timestamp}`);
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

// Rate limiting — prepreči brute force
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minut
  const now = Date.now();

  const record = loginAttempts.get(ip);

  if (!record || now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const waitMs = WINDOW_MS - (now - record.lastAttempt);
    return { allowed: false, waitSeconds: Math.ceil(waitMs / 1000) };
  }

  record.count++;
  record.lastAttempt = now;
  return { allowed: true };
}

function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export async function POST(req: NextRequest) {
  // Pridobi IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Rate limiting
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Preveč neuspešnih poskusov. Počakaj ${Math.ceil((rateCheck.waitSeconds || 900) / 60)} minut.` },
      { status: 429 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven zahtevek" }, { status: 400 });
  }

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Manjka uporabniško ime ali geslo" }, { status: 400 });
  }

  // Preveri vse uporabnike
  let authenticated = false;
  for (const user of USERS) {
    if (safeCompare(username, user.username) && safeCompare(password, user.password)) {
      authenticated = true;
      break;
    }
  }

  if (!authenticated) {
    return NextResponse.json({ error: "Napačno uporabniško ime ali geslo." }, { status: 401 });
  }

  // Uspešna prijava — resetiraj rate limit
  resetRateLimit(ip);

  // Nastavi varni session cookie
  const sessionToken = generateSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set("dashboard_auth", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 dni
    path: "/",
  });

  return NextResponse.json({ ok: true });
}