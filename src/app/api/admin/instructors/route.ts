import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET() {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const instructors = await prisma.instructor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { blueprints: true } },
    },
  });

  return NextResponse.json(instructors);
}
