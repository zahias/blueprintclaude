import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";
import { COURSE_REPORT_STATUSES, type CourseReportStatusValue } from "@/lib/courseReports.server";

export async function GET(req: NextRequest) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const majorIds = await getCoordinatorMajorIds(coordinator);
  const status = req.nextUrl.searchParams.get("status");
  const statusFilter = status && COURSE_REPORT_STATUSES.includes(status as CourseReportStatusValue)
    ? status as CourseReportStatusValue
    : null;

  const reports = await prisma.courseReport.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : { status: { in: ["SUBMITTED", "APPROVED", "NEEDS_REVISION"] } }),
      courseOffering: { course: { majorId: { in: majorIds } } },
    },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
    include: {
      instructor: { select: { name: true, email: true } },
      courseOffering: {
        include: {
          term: true,
          course: { include: { major: { select: { id: true, name: true } } } },
          _count: { select: { enrollments: true, blueprints: true, gradeAssessments: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(reports);
}
