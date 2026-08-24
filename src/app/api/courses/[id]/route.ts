import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCourseSyllabusId, syllabusWhere } from "@/lib/syllabus.server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const syllabusId = await resolveCourseSyllabusId(id, req.nextUrl.searchParams);
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      major: true,
      topics: {
        where: syllabusWhere(syllabusId),
        orderBy: { sortOrder: "asc" },
        include: { los: { include: { learningOutcome: true } } },
      },
      los: { where: syllabusWhere(syllabusId), orderBy: { code: "asc" } },
      syllabi: { orderBy: [{ isCurrent: "desc" }, { updatedAt: "desc" }] },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  await req.json().catch(() => null);
  return NextResponse.json(
    { error: "Course metadata is managed through progress report and syllabus import." },
    { status: 410 }
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return NextResponse.json(
    { error: "Courses imported for term history cannot be deleted through the legacy course API." },
    { status: 410 }
  );
}
