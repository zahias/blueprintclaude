import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET() {
  const majors = await prisma.major.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
  return NextResponse.json(majors);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const major = await prisma.major.create({
    data: { name, description },
  });
  return NextResponse.json(major, { status: 201 });
}
