import { NextRequest, NextResponse } from "next/server";
import { getVerifiedInstructor } from "@/lib/session.server";
import {
  COURSE_REPORT_STATUSES,
  emptyCourseReportData,
  ensureCourseReport,
  getInstructorCourseReportOffering,
  type CourseReportStatusValue,
} from "@/lib/courseReports.server";
import prisma from "@/lib/prisma";

function normalizeJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeResponses(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeText(item)]),
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const offering = await getInstructorCourseReportOffering(courseId, instructor);
  if (!offering) return NextResponse.json({ error: "Course offering not found" }, { status: 404 });

  const report = offering.courseReport || (offering.editable ? await ensureCourseReport(offering.id, instructor.id) : null);
  return NextResponse.json({
    offering,
    report: report || { status: "DRAFT", ...emptyCourseReportData(), comments: [] },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const offering = await getInstructorCourseReportOffering(courseId, instructor);
  if (!offering) return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  if (!offering.editable) return NextResponse.json({ error: "Previous-term course reports are read only" }, { status: 403 });

  const existing = await ensureCourseReport(offering.id, instructor.id);
  if (existing.status === "SUBMITTED" || existing.status === "APPROVED") {
    return NextResponse.json({ error: "Submitted or approved course reports cannot be edited" }, { status: 403 });
  }

  const body = await req.json();
  const requestedStatus = (body.status || existing.status) as CourseReportStatusValue;
  if (!COURSE_REPORT_STATUSES.includes(requestedStatus)) {
    return NextResponse.json({ error: "Invalid course report status" }, { status: 400 });
  }
  if (requestedStatus === "APPROVED") {
    return NextResponse.json({ error: "Instructors cannot approve course reports" }, { status: 403 });
  }

  const data = {
    responses: normalizeResponses(body.responses),
    topicsCovered: normalizeJsonArray(body.topicsCovered),
    attendanceConcerns: normalizeJsonArray(body.attendanceConcerns),
    highestScores: normalizeJsonArray(body.highestScores),
    lowestScores: normalizeJsonArray(body.lowestScores),
    assessmentEvidence: normalizeJsonArray(body.assessmentEvidence),
    gradeSummary: normalizeText(body.gradeSummary),
    reflection: normalizeText(body.reflection),
    improvementPlan: normalizeText(body.improvementPlan),
    evidenceNotes: normalizeText(body.evidenceNotes),
    status: requestedStatus,
    submittedAt: requestedStatus === "SUBMITTED" ? new Date() : existing.submittedAt,
    reviewedAt: requestedStatus === "SUBMITTED" ? null : existing.reviewedAt,
    reviewedById: requestedStatus === "SUBMITTED" ? null : existing.reviewedById,
  };

  const report = await prisma.courseReport.update({
    where: { id: existing.id },
    data,
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: { coordinator: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json(report);
}
