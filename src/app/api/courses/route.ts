import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const majorId = req.nextUrl.searchParams.get("majorId");
  const where = majorId ? { majorId } : {};

  const courses = await prisma.course.findMany({
    where,
    orderBy: { code: "asc" },
    include: {
      major: { select: { name: true } },
      _count: { select: { topics: true, los: true, blueprints: true } },
    },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { majorId, code, name, description } = await req.json();
  if (!majorId || !code || !name) {
    return NextResponse.json({ error: "majorId, code, and name are required" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: { majorId, code, name, description },
  });
  return NextResponse.json(course, { status: 201 });
}
