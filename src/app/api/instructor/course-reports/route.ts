import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedInstructor } from "@/lib/session.server";
import { getActiveTerm } from "@/lib/terms.server";

export async function GET() {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeTerm = await getActiveTerm();
  const offerings = await prisma.courseOffering.findMany({
    where: { instructors: { some: { instructorId: instructor.id } } },
    orderBy: [{ term: { isActive: "desc" } }, { term: { academicYear: "desc" } }, { course: { code: "asc" } }],
    include: {
      term: true,
      course: { include: { major: { select: { id: true, name: true } } } },
      courseReport: { select: { id: true, status: true, submittedAt: true, reviewedAt: true, updatedAt: true } },
      _count: { select: { enrollments: true, blueprints: true, gradeAssessments: true } },
    },
  });

  return NextResponse.json(offerings.map((offering) => ({
    id: offering.id,
    editable: activeTerm ? offering.termId === activeTerm.id : offering.term.isActive,
    term: offering.term,
    course: offering.course,
    report: offering.courseReport,
    counts: offering._count,
  })));
}
