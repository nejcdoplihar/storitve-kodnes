// lib/session.ts
// Preveri podpisani sejni JWT (dashboard_session), kot ga izda /api/login.
// Edge-združljivo (jose). Vrne payload ali null (neveljaven/potekel/manjka).

import { jwtVerify } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-32chars-minimum!";
const secret = new TextEncoder().encode(SESSION_SECRET);

export type SessionPayload = {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
};

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
