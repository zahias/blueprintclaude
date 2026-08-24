import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedAdmin } from "@/lib/session.server";
import { getInstructorFromCookies } from "@/lib/instructorAuth";
import { getInstructorActiveOffering } from "@/lib/terms.server";
import {
  getBlueprintPayloadIssues,
  getQuestionFormatIssues,
  getSubmitIssues,
  type BlueprintQuestionFormatEntry,
  type BlueprintTopicEntry,
} from "@/lib/types";

// Admin: list all blueprints with optional filters
export async function GET(req: NextRequest) {
  const admin = await getVerifiedAdmin();
  const status = req.nextUrl.searchParams.get("status");
  const semester = req.nextUrl.searchParams.get("semester");
  const academicYear = req.nextUrl.searchParams.get("academicYear");

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (semester) where.semester = semester;
  if (academicYear) where.academicYear = academicYear;

  const blueprints = await prisma.blueprint.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      course: { include: { major: { select: { name: true } } } },
      _count: { select: { topics: true, comments: true } },
    },
  });
  return NextResponse.json(blueprints);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { courseId, instructorName, title, examDate, duration, totalMarks, topics, questionFormats, status, semester, academicYear } = body;

  if (!courseId || !instructorName || !title || totalMarks === undefined) {
    return NextResponse.json(
      { error: "courseId, instructorName, title, and totalMarks are required" },
      { status: 400 }
    );
  }

  const parsedTotalMarks = parseFloat(totalMarks);
  if (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks < 0) {
    return NextResponse.json({ error: "totalMarks must be 0 or more" }, { status: 400 });
  }

  const instructor = await getInstructorFromCookies();
  const activeOffering = instructor ? await getInstructorActiveOffering(courseId, instructor) : null;
  if (instructor && !activeOffering) {
    return NextResponse.json({ error: "Blueprints can only be created for active-term assigned courses" }, { status: 403 });
  }

  const syllabusId = activeOffering?.syllabi?.[0]?.id;
  const courseTopics = await prisma.topic.findMany({
    where: syllabusId ? { courseId, syllabusId } : { courseId },
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

  const blueprint = await prisma.blueprint.create({
    data: {
      courseId,
      courseOfferingId: activeOffering?.id || null,
      instructorName,
      instructorId: instructor?.id || null,
      title,
      semester: activeOffering?.term.semester || semester || null,
      academicYear: activeOffering?.term.academicYear || academicYear || null,
      examDate: examDate ? new Date(examDate) : null,
      duration: duration || null,
      totalMarks: parsedTotalMarks,
      status: status || "DRAFT",
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

  return NextResponse.json(blueprint, { status: 201 });
}
