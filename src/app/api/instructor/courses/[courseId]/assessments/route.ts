import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assessmentWeightTotal } from "@/lib/grades";
import { getVerifiedInstructor } from "@/lib/session.server";
import { ensureGradebook, getInstructorCourse } from "@/lib/gradebook.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await getInstructorCourse(courseId, instructor);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.editable || !course.activeOfferingId) {
    return NextResponse.json({ error: "Only active-term assigned courses can be edited" }, { status: 403 });
  }

  const { name, weightPercent, maxPoints } = await req.json();
  const weight = Number(weightPercent);
  const max = Number(maxPoints);
  if (!name || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(max) || max <= 0) {
    return NextResponse.json({ error: "Name, positive weight, and positive max points are required" }, { status: 400 });
  }

  const gradebook = await ensureGradebook(course.activeOfferingId);
  if (!["DRAFT", "NEEDS_REVISION"].includes(gradebook.status)) {
    return NextResponse.json({ error: "New assessments cannot be added while the gradebook is submitted or approved" }, { status: 403 });
  }

  const existingAssessments = await prisma.gradeAssessment.findMany({ where: { courseOfferingId: course.activeOfferingId } });
  const total = assessmentWeightTotal([...existingAssessments, { weightPercent: weight }]);
  if (total > 100) {
    return NextResponse.json({ error: `Assessment weights cannot exceed 100% (currently ${total}%)` }, { status: 400 });
  }

  const assessment = await prisma.gradeAssessment.create({
    data: {
      courseId,
      courseOfferingId: course.activeOfferingId,
      instructorId: instructor.id,
      name,
      weightPercent: weight,
      maxPoints: max,
      blueprintId: null,
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
