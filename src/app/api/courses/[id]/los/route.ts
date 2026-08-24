import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCourseSyllabusId, syllabusWhere } from "@/lib/syllabus.server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const syllabusId = await resolveCourseSyllabusId(courseId, req.nextUrl.searchParams);
  const los = await prisma.learningOutcome.findMany({
    where: { courseId, ...syllabusWhere(syllabusId) },
    orderBy: { code: "asc" },
    include: { topics: { include: { topic: true } } },
  });
  return NextResponse.json(los);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  await req.json().catch(() => null);
  return NextResponse.json(
    { error: "CLOs are managed through syllabus import for the selected term." },
    { status: 410 }
  );
}
