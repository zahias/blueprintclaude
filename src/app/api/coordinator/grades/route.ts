import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { deriveGradebookStatus, getCoordinatorMajorIds } from "@/lib/gradebook.server";

export async function GET() {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const majorIds = await getCoordinatorMajorIds(coordinator);
  if (majorIds.length === 0) return NextResponse.json([]);

  const offerings = await prisma.courseOffering.findMany({
    where: {
      course: { majorId: { in: majorIds } },
      OR: [
        { gradebook: { status: { in: ["SUBMITTED", "APPROVED", "NEEDS_REVISION"] } } },
        { gradeAssessments: { some: { status: { in: ["SUBMITTED", "APPROVED", "NEEDS_REVISION"] } } } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      course: { include: { major: { select: { name: true } } } },
      instructors: { include: { instructor: { select: { name: true, email: true } } } },
      gradeAssessments: {
        include: { _count: { select: { entries: true } } },
        orderBy: { createdAt: "asc" },
      },
      gradebook: { include: { _count: { select: { comments: true } } } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json(offerings.map((offering) => {
    const statuses = offering.gradeAssessments.map((assessment) => assessment.status);
    const status = offering.gradebook?.status || deriveGradebookStatus(statuses);
    const comments = offering.gradebook?._count.comments || 0;
    const entries = offering.gradeAssessments.reduce((sum, assessment) => sum + assessment._count.entries, 0);
    const submittedAt = offering.gradebook?.submittedAt || offering.gradeAssessments
      .map((assessment) => assessment.submittedAt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    return {
      id: offering.id,
      status,
      submittedAt,
      course: offering.course,
      instructor: offering.instructors[0]?.instructor || { name: "Unassigned", email: "" },
      assessmentCount: offering.gradeAssessments.length,
      rosterCount: offering._count.enrollments,
      _count: { entries, comments },
    };
  }));
}
