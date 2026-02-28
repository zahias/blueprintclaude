import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { getInstructorFromCookies } from "@/lib/instructorAuth";

// Admin: list all blueprints with optional filters
export async function GET(req: NextRequest) {
  const admin = await getAdminFromCookies();
  const status = req.nextUrl.searchParams.get("status");
  const semester = req.nextUrl.searchParams.get("semester");
  const academicYear = req.nextUrl.searchParams.get("academicYear");

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (semester) where.semester = semester;
  if (academicYear) where.academicYear = academicYear;

  const blueprints = await prisma.blueprint.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      course: { include: { major: { select: { name: true } } } },
      _count: { select: { topics: true, comments: true } },
    },
  });
  return NextResponse.json(blueprints);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { courseId, instructorName, title, examDate, duration, totalMarks, topics, status, semester, academicYear } = body;

  if (!courseId || !instructorName || !title || totalMarks === undefined) {
    return NextResponse.json(
      { error: "courseId, instructorName, title, and totalMarks are required" },
      { status: 400 }
    );
  }

  // Try to get instructor from cookies for linking
  const instructor = await getInstructorFromCookies();

  const blueprint = await prisma.blueprint.create({
    data: {
      courseId,
      instructorName,
      instructorId: instructor?.id || null,
      title,
      semester: semester || null,
      academicYear: academicYear || null,
      examDate: examDate ? new Date(examDate) : null,
      duration: duration || null,
      totalMarks: parseFloat(totalMarks),
      status: status || "DRAFT",
      topics: topics?.length
        ? {
            create: topics.map(
              (t: {
                topicId: string;
                questionCount: number;
                totalPoints: number;
                bloomRemember: number;
                bloomUnderstand: number;
                bloomApply: number;
                bloomAnalyze: number;
                bloomEvaluate: number;
                bloomCreate: number;
                questionTypes: { questionType: string; count: number }[];
              }) => ({
                topicId: t.topicId,
                questionCount: t.questionCount,
                totalPoints: t.totalPoints,
                bloomRemember: t.bloomRemember || 0,
                bloomUnderstand: t.bloomUnderstand || 0,
                bloomApply: t.bloomApply || 0,
                bloomAnalyze: t.bloomAnalyze || 0,
                bloomEvaluate: t.bloomEvaluate || 0,
                bloomCreate: t.bloomCreate || 0,
                questionTypes: t.questionTypes?.length
                  ? {
                      create: t.questionTypes.map(
                        (qt: { questionType: string; count: number }) => ({
                          questionType: qt.questionType,
                          count: qt.count,
                        })
                      ),
                    }
                  : undefined,
              })
            ),
          }
        : undefined,
    },
    include: {
      topics: { include: { questionTypes: true, topic: true } },
    },
  });

  return NextResponse.json(blueprint, { status: 201 });
}
