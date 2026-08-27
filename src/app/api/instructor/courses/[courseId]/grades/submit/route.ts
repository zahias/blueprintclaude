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
  const gradebook = await ensureGradebook(course.activeOfferingId);
  if (!["DRAFT", "NEEDS_REVISION"].includes(gradebook.status)) {
    return NextResponse.json({ error: `The gradebook cannot be submitted from ${gradebook.status}` }, { status: 400 });
  }

  const allAssessments = await prisma.gradeAssessment.findMany({
    where: { courseId, courseOfferingId: course.activeOfferingId },
    include: { entries: true },
  });
  if (allAssessments.length === 0) {
    return NextResponse.json({ error: "Create assessments before submitting the gradebook" }, { status: 400 });
  }
  if (assessmentWeightTotal(allAssessments) !== 100) {
    return NextResponse.json({ error: "Assessment weights must total exactly 100% before submission" }, { status: 400 });
  }
  const enrolledCount = await prisma.courseEnrollment.count({ where: { courseId, courseOfferingId: course.activeOfferingId } });
  if (enrolledCount === 0) {
    return NextResponse.json({ error: "Roster has not been imported by the coordinator yet" }, { status: 400 });
  }
  const incomplete = allAssessments.find((assessment) => assessment.entries.filter((entry) => entry.rawPoints !== null).length < enrolledCount);
  if (incomplete) {
    return NextResponse.json({ error: `${incomplete.name} has missing student grades` }, { status: 400 });
  }

  const submittedAt = new Date();
  await prisma.$transaction([
    prisma.gradebook.update({
      where: { id: gradebook.id },
      data: { status: "SUBMITTED", submittedAt, reviewedAt: null, reviewedById: null },
    }),
    prisma.gradeAssessment.updateMany({
      where: { courseId, courseOfferingId: course.activeOfferingId },
      data: { status: "SUBMITTED", submittedAt },
    }),
  ]);

  return NextResponse.json({ submitted: allAssessments.length, status: "SUBMITTED" });
}
