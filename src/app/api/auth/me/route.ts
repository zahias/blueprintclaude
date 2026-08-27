import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { clearRoleCookies } from "@/lib/cookies";

export async function GET() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ admin: null }, { status: 401 });
  }
  const dbAdmin = await prisma.admin.findUnique({
    where: { id: admin.id },
    select: { id: true, email: true, name: true },
  });
  if (!dbAdmin) {
    const response = NextResponse.json({ admin: null, error: "Stale session. Please log in again." }, { status: 401 });
    clearRoleCookies(response);
    return response;
  }
  return NextResponse.json({ admin: dbAdmin });
}
