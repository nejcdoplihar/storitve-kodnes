import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "profiles.json");

type Profile = {
  fullName: string;
  email: string;
  position: string;
  avatarUrl: string;
};

type ProfilesMap = Record<string, Profile>;

function readProfiles(): ProfilesMap {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeProfiles(data: ProfilesMap) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function GET() {
  const cookieStore = await cookies();
  const username = cookieStore.get("dashboard_auth")?.value || "";

  if (!username) {
    return NextResponse.json({ error: "Ni prijave." }, { status: 401 });
  }

  const profiles = readProfiles();
  const profile = profiles[username] || {
    fullName: username,
    email: "",
    position: "",
    avatarUrl: "",
  };

  return NextResponse.json({
    username,
    profile,
  });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const username = cookieStore.get("dashboard_auth")?.value || "";

  if (!username) {
    return NextResponse.json({ error: "Ni prijave." }, { status: 401 });
  }

  const body = await req.json();

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const position = String(body.position || "").trim();
  const avatarUrl = String(body.avatarUrl || "").trim();

  if (!fullName) {
    return NextResponse.json({ error: "Ime in priimek je obvezen." }, { status: 400 });
  }

  const profiles = readProfiles();

  profiles[username] = {
    fullName,
    email,
    position,
    avatarUrl,
  };

  writeProfiles(profiles);

  return NextResponse.json({ ok: true });
}