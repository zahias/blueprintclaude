import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ admin: null }, { status: 401 });
  }
  return NextResponse.json({ admin });
}
