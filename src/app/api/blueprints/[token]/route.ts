import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { notifyBlueprintStatusChange } from "@/lib/email";
import {
  getBlueprintPayloadIssues,
  getQuestionFormatIssues,
  getSubmitIssues,
  type BlueprintQuestionFormatEntry,
  type BlueprintTopicEntry,
} from "@/lib/types";
import { getInstructorCourse } from "@/lib/gradebook.server";
import { getVerifiedInstructor } from "@/lib/session.server";

// Fetch blueprint by accessToken (public) or by id (admin)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Try by accessToken first (public access), then by id (admin access)
  let blueprint = await prisma.blueprint.findUnique({
    where: { accessToken: token },
    include: {
      course: {
        include: {
          major: true,
          topics: {
            orderBy: { sortOrder: "asc" },
            include: { los: { include: { learningOutcome: true } } },
          },
          los: { orderBy: { code: "asc" } },
        },
      },
      topics: {
        include: {
          topic: { include: { los: { include: { learningOutcome: true } } } },
        },
      },
      questionFormats: true,
      comments: {
        include: {
          admin: { select: { name: true } },
          coordinator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!blueprint) {
    // Try by ID (admin only)
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    blueprint = await prisma.blueprint.findUnique({
      where: { id: token },
      include: {
        course: {
          include: {
            major: true,
            topics: {
              orderBy: { sortOrder: "asc" },
              include: { los: { include: { learningOutcome: true } } },
            },
            los: { orderBy: { code: "asc" } },
          },
        },
        topics: {
          include: {
            topic: { include: { los: { include: { learningOutcome: true } } } },
          },
        },
        questionFormats: true,
        comments: {
          include: {
            admin: { select: { name: true } },
            coordinator: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(blueprint);
}

// Update blueprint by access token for the owning instructor only.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();

  const existing = await prisma.blueprint.findUnique({
    where: { accessToken: token },
    include: {
      topics: { include: { topic: { select: { syllabusId: true } } } },
      courseOffering: { include: { syllabi: { where: { isCurrent: true }, select: { id: true }, take: 1 } } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const instructor = await getVerifiedInstructor();
  if (!instructor || existing.instructorId !== instructor.id) {
    return NextResponse.json({ error: "Only the owning instructor can edit this blueprint" }, { status: 403 });
  }
  const instructorCourse = await getInstructorCourse(existing.courseId, instructor);
  if (!instructorCourse?.editable || !instructorCourse.activeOfferingId || instructorCourse.activeOfferingId !== existing.courseOfferingId) {
    return NextResponse.json({ error: "Only active-term assigned blueprints can be edited" }, { status: 403 });
  }

  // Only allow editing DRAFT or NEEDS_REVISION blueprints
  // Also allow withdrawing a SUBMITTED blueprint back to DRAFT
  if (body.status === "DRAFT" && existing.status === "SUBMITTED") {
    const updated = await prisma.blueprint.update({
      where: { id: existing.id },
      data: { status: "DRAFT" },
    });
    return NextResponse.json(updated);
  }
  if (existing.status !== "DRAFT" && existing.status !== "NEEDS_REVISION") {
    return NextResponse.json(
      { error: "Blueprint is submitted or approved and cannot be edited" },
      { status: 403 }
    );
  }

  const { instructorName, title, examDate, duration, totalMarks, topics, questionFormats, status, semester, academicYear } = body;

  const parsedTotalMarks = parseFloat(totalMarks);
  if (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks < 0) {
    return NextResponse.json({ error: "totalMarks must be 0 or more" }, { status: 400 });
  }

  const syllabusId = existing.topics[0]?.topic.syllabusId || existing.courseOffering?.syllabi[0]?.id || null;
  const courseTopics = await prisma.topic.findMany({
    where: { courseId: existing.courseId, syllabusId },
    select: { id: true, name: true },
  });
  const topicEntries = ((topics || []) as BlueprintTopicEntry[]).map((topic) => ({
    ...topic,
    totalPoints: topic.questionCount,
  }));
  const formatEntries = ((questionFormats || []) as BlueprintQuestionFormatEntry[])
    .filter((format) => format.questionCount > 0 || format.gradeWeight > 0)
    .map((format) => ({
      ...format,
      label: format.label || format.formatType.replaceAll("_", " "),
    }));
  const payloadIssues = getBlueprintPayloadIssues(topicEntries, courseTopics);
  const formatIssues = getQuestionFormatIssues(formatEntries, parsedTotalMarks, status === "SUBMITTED");
  const submitIssues = status === "SUBMITTED"
    ? getSubmitIssues(topicEntries, courseTopics, parsedTotalMarks)
    : [];
  const issues = [
    ...payloadIssues,
    ...formatIssues.filter((issue) => !payloadIssues.includes(issue)),
    ...submitIssues.filter((issue) => !payloadIssues.includes(issue) && !formatIssues.includes(issue)),
  ];
  if (issues.length > 0) {
    return NextResponse.json({ error: "Blueprint validation failed", issues }, { status: 400 });
  }

  // Delete existing blueprint topics and recreate
  await prisma.blueprintTopic.deleteMany({ where: { blueprintId: existing.id } });
  await prisma.blueprintQuestionFormat.deleteMany({ where: { blueprintId: existing.id } });

  const blueprint = await prisma.blueprint.update({
    where: { id: existing.id },
    data: {
      instructorName,
      title,
      examDate: examDate ? new Date(examDate) : null,
      duration: duration || null,
      totalMarks: parsedTotalMarks,
      status: status || existing.status,
      semester: semester || null,
      academicYear: academicYear || null,
      topics: topicEntries.length
        ? {
            create: topicEntries.map(
              (t: {
                topicId: string;
                questionCount: number;
                totalPoints: number;
                bloomRemember: number;
                bloomUnderstand: number;
                bloomApply: number;
                bloomAnalyze: number;
                bloomEvaluate: number;
                bloomCreate: number;
              }) => ({
                topic: { connect: { id: t.topicId } },
                questionCount: t.questionCount,
                totalPoints: t.totalPoints,
                bloomRemember: t.bloomRemember || 0,
                bloomUnderstand: t.bloomUnderstand || 0,
                bloomApply: t.bloomApply || 0,
                bloomAnalyze: t.bloomAnalyze || 0,
                bloomEvaluate: t.bloomEvaluate || 0,
                bloomCreate: t.bloomCreate || 0,
              })
            ),
          }
        : undefined,
      questionFormats: formatEntries.length
        ? {
            create: formatEntries.map((format) => ({
              formatType: format.formatType,
              group: format.group,
              label: format.label,
              questionCount: format.questionCount,
              gradeWeight: format.gradeWeight,
            })),
          }
        : undefined,
    },
    include: {
      topics: { include: { topic: true } },
      questionFormats: true,
    },
  });

  if (status === "SUBMITTED") notifyBlueprintStatusChange(blueprint.id, "SUBMITTED");

  return NextResponse.json(blueprint);
}
