import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  await req.json().catch(() => null);
  return NextResponse.json(
    { error: "Courses are created through progress report import and completed through syllabus import." },
    { status: 410 }
  );
}
