import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedInstructor } from "@/lib/session.server";
import { getActiveTerm } from "@/lib/terms.server";
import { deriveGradebookStatus } from "@/lib/gradebook.server";

export async function GET() {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeTerm = await getActiveTerm();
  if (activeTerm) {
    const offerings = await prisma.courseOffering.findMany({
      where: { instructors: { some: { instructorId: instructor.id } } },
      orderBy: [{ term: { academicYear: "desc" } }, { term: { semester: "asc" } }, { course: { code: "asc" } }],
      include: {
        term: true,
        gradeAssessments: { select: { status: true } },
        gradebook: { select: { status: true } },
        course: {
          include: {
            major: { select: { id: true, name: true } },
            _count: { select: { topics: true, los: true } },
          },
        },
        _count: { select: { blueprints: true, enrollments: true, gradeAssessments: true } },
      },
    });

    return NextResponse.json(offerings.map((offering) => {
      const status = offering.gradebook?.status || deriveGradebookStatus(offering.gradeAssessments.map((assessment) => assessment.status));
      const hasGradebookWork = offering._count.gradeAssessments > 0;
      return {
        ...offering.course,
        activeOfferingId: offering.id,
        term: offering.term,
        editable: offering.termId === activeTerm.id,
        gradebookStatus: hasGradebookWork ? status : null,
        _count: {
          ...offering.course._count,
          blueprints: offering._count.blueprints,
          enrollments: offering._count.enrollments,
          gradeAssessments: offering._count.gradeAssessments,
        },
      };
    }));
  }

  const courses = await prisma.course.findMany({
    where: {
      major: {
        instructors: {
          some: { instructorId: instructor.id },
        },
      },
    },
    orderBy: [{ major: { name: "asc" } }, { code: "asc" }],
    include: {
      major: { select: { id: true, name: true } },
      _count: { select: { topics: true, los: true, blueprints: true, enrollments: true, gradeAssessments: true } },
    },
  });

  return NextResponse.json(courses.map((course) => ({ ...course, activeOfferingId: null, term: null, editable: false })));
}
