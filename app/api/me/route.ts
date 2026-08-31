import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/agentWriteAuth";

export async function GET() {
  const username = (await getSessionUser()) || "";
  return NextResponse.json({ username });
}