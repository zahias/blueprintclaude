import { NextResponse } from "next/server";
import { clearRoleCookies } from "@/lib/cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearRoleCookies(response);
  return response;
}
