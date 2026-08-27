import { NextResponse } from "next/server";
import { clearRoleCookies } from "@/lib/cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearRoleCookies(response);
  return response;
}
