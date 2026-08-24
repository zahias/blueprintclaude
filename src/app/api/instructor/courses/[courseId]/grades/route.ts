import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedInstructor } from "@/lib/session.server";
import { ensureGradebook, getInstructorCourse } from "@/lib/gradebook.server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const startedAt = Date.now();
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await getInstructorCourse(courseId, instructor);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.editable || !course.activeOfferingId) {
    return NextResponse.json({ error: "Only active-term assigned courses can be edited" }, { status: 403 });
  }
  const gradebook = await ensureGradebook(course.activeOfferingId);
  if (!["DRAFT", "NEEDS_REVISION"].includes(gradebook.status)) {
    return NextResponse.json({ error: "The gradebook is locked while submitted or approved" }, { status: 403 });
  }

  const { grades } = await req.json() as { grades?: { assessmentId: string; studentId: string; rawPoints: number | null }[] };
  if (!Array.isArray(grades)) return NextResponse.json({ error: "grades array is required" }, { status: 400 });

  const assessmentIds = Array.from(new Set(grades.map((grade) => grade.assessmentId)));
  const studentIds = Array.from(new Set(grades.map((grade) => grade.studentId)));
  const [assessments, enrollments] = await Promise.all([
    prisma.gradeAssessment.findMany({ where: { id: { in: assessmentIds }, courseId, courseOfferingId: course.activeOfferingId } }),
    prisma.courseEnrollment.findMany({
      where: { courseId, courseOfferingId: course.activeOfferingId, studentId: { in: studentIds } },
      select: { studentId: true },
    }),
  ]);
  const assessmentMap = new Map(assessments.map((assessment) => [assessment.id, assessment]));
  const enrolledStudentIds = new Set(enrollments.map((enrollment) => enrollment.studentId));
  const writes = [];
  for (const grade of grades) {
    const assessment = assessmentMap.get(grade.assessmentId);
    if (!assessment) return NextResponse.json({ error: "Assessment does not belong to this course" }, { status: 400 });
    const rawPoints = grade.rawPoints === null || grade.rawPoints === undefined || String(grade.rawPoints) === ""
      ? null
      : Number(grade.rawPoints);
    if (rawPoints !== null && (!Number.isFinite(rawPoints) || rawPoints < 0 || rawPoints > assessment.maxPoints)) {
      return NextResponse.json({ error: `Grade for ${assessment.name} must be between 0 and ${assessment.maxPoints}` }, { status: 400 });
    }
    if (!enrolledStudentIds.has(grade.studentId)) {
      return NextResponse.json({ error: "Student is not enrolled in this course" }, { status: 400 });
    }

    writes.push(prisma.gradeEntry.upsert({
      where: { assessmentId_studentId: { assessmentId: grade.assessmentId, studentId: grade.studentId } },
      update: { rawPoints },
      create: { assessmentId: grade.assessmentId, studentId: grade.studentId, rawPoints },
    }));
  }

  await prisma.$transaction(writes);
  console.info(`[api/grades/save] ${grades.length} entries ${Date.now() - startedAt}ms`);
  return NextResponse.json({ updated: grades.length });
}
