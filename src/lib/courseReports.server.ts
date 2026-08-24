import prisma from "@/lib/prisma";
import type { CoordinatorPayload } from "@/lib/coordinatorAuth";
import type { InstructorPayload } from "@/lib/instructorAuth";
import { getActiveTerm } from "@/lib/terms.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";

export const COURSE_REPORT_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "NEEDS_REVISION"] as const;
export type CourseReportStatusValue = typeof COURSE_REPORT_STATUSES[number];

export function emptyCourseReportData() {
  return {
    responses: {},
    topicsCovered: [],
    attendanceConcerns: [],
    highestScores: [],
    lowestScores: [],
    assessmentEvidence: [],
    gradeSummary: "",
    reflection: "",
    improvementPlan: "",
    evidenceNotes: "",
  };
}

export async function getInstructorCourseReportOffering(courseId: string, instructor: InstructorPayload) {
  const activeTerm = await getActiveTerm();
  const offering = await prisma.courseOffering.findFirst({
    where: {
      courseId,
      instructors: { some: { instructorId: instructor.id } },
      ...(activeTerm ? {} : { term: { isActive: true } }),
    },
    orderBy: [{ term: { isActive: "desc" } }, { updatedAt: "desc" }],
    include: {
      term: true,
      course: { include: { major: { select: { id: true, name: true } }, topics: { orderBy: { sortOrder: "asc" } } } },
      courseReport: {
        include: {
          comments: {
            orderBy: { createdAt: "desc" },
            include: { coordinator: { select: { name: true } } },
          },
        },
      },
      _count: { select: { enrollments: true, blueprints: true, gradeAssessments: true } },
    },
  });
  if (!offering) return null;
  return {
    ...offering,
    editable: activeTerm ? offering.termId === activeTerm.id : offering.term.isActive,
  };
}

export async function ensureCourseReport(courseOfferingId: string, instructorId: string) {
  return prisma.courseReport.upsert({
    where: { courseOfferingId },
    update: {},
    create: { courseOfferingId, instructorId },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: { coordinator: { select: { name: true } } },
      },
    },
  });
}

export async function coordinatorCanAccessCourseReport(reportId: string, coordinator: CoordinatorPayload) {
  const majorIds = await getCoordinatorMajorIds(coordinator);
  return prisma.courseReport.findFirst({
    where: {
      id: reportId,
      courseOffering: { course: { majorId: { in: majorIds } } },
    },
    include: {
      instructor: { select: { name: true, email: true } },
      courseOffering: {
        include: {
          term: true,
          course: { include: { major: { select: { id: true, name: true } } } },
          _count: { select: { enrollments: true, blueprints: true, gradeAssessments: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { coordinator: { select: { name: true } } },
      },
    },
  });
}
