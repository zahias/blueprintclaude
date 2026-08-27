import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { deriveGradebookStatus, ensureGradebook, getCoordinatorMajorIds } from "@/lib/gradebook.server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offeringId: string }> }
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offeringId } = await params;
  const majorIds = await getCoordinatorMajorIds(coordinator);

  const offering = await prisma.courseOffering.findFirst({
    where: { id: offeringId, course: { majorId: { in: majorIds } } },
    include: {
      course: {
        include: {
          major: { select: { name: true } },
        },
      },
      instructors: { include: { instructor: { select: { name: true, email: true } } } },
      enrollments: {
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
        include: { student: true },
      },
      gradeAssessments: {
        orderBy: { createdAt: "asc" },
        include: {
          entries: true,
        },
      },
      gradebook: {
        include: {
          comments: {
            orderBy: { createdAt: "desc" },
            include: { coordinator: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!offering) return NextResponse.json({ error: "Gradebook not found" }, { status: 404 });
  const statuses = offering.gradeAssessments.map((assessment) => assessment.status);
  const gradebook = offering.gradebook || await ensureGradebook(offering.id);

  return NextResponse.json({
    id: offering.id,
    status: gradebook.status || deriveGradebookStatus(statuses),
    instructor: offering.instructors[0]?.instructor || { name: "Unassigned", email: "" },
    course: {
      ...offering.course,
      enrollments: offering.enrollments,
    },
    assessments: offering.gradeAssessments,
    comments: gradebook.comments,
  });
}
