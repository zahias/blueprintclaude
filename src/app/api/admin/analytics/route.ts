import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedAdmin } from "@/lib/session.server";
import { COURSE_PROGRESS_REPORT_PROMPTS } from "@/lib/constants";

const BLOOM_KEYS = [
  "bloomRemember",
  "bloomUnderstand",
  "bloomApply",
  "bloomAnalyze",
  "bloomEvaluate",
  "bloomCreate",
] as const;

const SEMESTER_ORDER: Record<string, number> = { FALL: 1, SPRING: 2, SUMMER: 3 };

type BloomKey = (typeof BLOOM_KEYS)[number];
type BloomMap = Record<BloomKey, number>;

type QuestionFormatSummary = {
  questionCount: number;
  gradeWeight: number;
};

function emptyQuestionFormatSummary(): Record<string, QuestionFormatSummary> {
  return {
    closedEnded: { questionCount: 0, gradeWeight: 0 },
    openEnded: { questionCount: 0, gradeWeight: 0 },
  };
}

function emptyBloom(): BloomMap {
  return {
    bloomRemember: 0,
    bloomUnderstand: 0,
    bloomApply: 0,
    bloomAnalyze: 0,
    bloomEvaluate: 0,
    bloomCreate: 0,
  };
}

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function termLabel(term?: { semester: string | null; academicYear: string | null } | null) {
  return term?.semester && term?.academicYear ? `${term.semester} ${term.academicYear}` : "Legacy";
}

function getBlueprintTerm(bp: any) {
  const term = bp.courseOffering?.term;
  return {
    id: term?.id ?? null,
    semester: term?.semester ?? bp.semester ?? null,
    academicYear: term?.academicYear ?? bp.academicYear ?? null,
  };
}

function resolveSyllabus(bp: any) {
  const course = bp.course;
  return (
    course.syllabi.find((s: any) => bp.courseOfferingId && s.courseOfferingId === bp.courseOfferingId) ??
    course.syllabi.find((s: any) => s.semester === bp.semester && s.academicYear === bp.academicYear) ??
    course.syllabi.find((s: any) => s.isCurrent) ??
    null
  );
}

function resolveCatalog(course: any, syllabus: any) {
  if (syllabus) {
    return {
      los: syllabus.los.map((lo: any) => ({ id: lo.id, code: lo.code, description: lo.description })),
      topics: syllabus.topics.map((topic: any) => ({ id: topic.id, name: topic.name })),
    };
  }

  const legacyLos = course.los.filter((lo: any) => !lo.syllabusId);
  const legacyTopics = course.topics.filter((topic: any) => !topic.syllabusId);
  return {
    los: (legacyLos.length > 0 ? legacyLos : course.los).map((lo: any) => ({
      id: lo.id,
      code: lo.code,
      description: lo.description,
    })),
    topics: (legacyTopics.length > 0 ? legacyTopics : course.topics).map((topic: any) => ({
      id: topic.id,
      name: topic.name,
    })),
  };
}

function buildCourseStats(blueprints: any[]) {
  const courseMap = new Map<string, any>();

  for (const bp of blueprints) {
    const term = getBlueprintTerm(bp);
    const key = bp.courseOfferingId ?? `${bp.courseId}|${term.semester ?? "legacy"}|${term.academicYear ?? "legacy"}`;
    let entry = courseMap.get(key);

    if (!entry) {
      const syllabus = resolveSyllabus(bp);
      const catalog = resolveCatalog(bp.course, syllabus);

      entry = {
        courseId: bp.courseId,
        courseOfferingId: bp.courseOfferingId,
        courseCode: bp.course.code,
        courseName: bp.course.name,
        majorId: bp.course.major.id,
        majorName: bp.course.major.name,
        term,
        blueprintCount: 0,
        blueprintQuestions: 0,
        totalQuestions: 0,
        bloom: emptyBloom(),
        questionFormats: emptyQuestionFormatSummary(),
        coveredLOs: new Set<string>(),
        coveredTopics: new Set<string>(),
        loQuestionMap: new Map<string, number>(),
        topicQuestionMap: new Map<string, number>(),
        loList: catalog.los.map((lo: any) => ({ ...lo, covered: false, questionCount: 0 })),
        topicList: catalog.topics.map((topic: any) => ({ ...topic, covered: false, questionCount: 0 })),
      };
      courseMap.set(key, entry);
    }

    entry.blueprintCount++;
    entry.blueprintQuestions += Number(bp.totalMarks) || 0;

    for (const format of bp.questionFormats || []) {
      const key = format.group === "CLOSED_ENDED" ? "closedEnded" : "openEnded";
      entry.questionFormats[key].questionCount += Number(format.questionCount) || 0;
      entry.questionFormats[key].gradeWeight += Number(format.gradeWeight) || 0;
    }

    for (const bt of bp.topics) {
      const questions = Number(bt.questionCount) || 0;
      entry.totalQuestions += questions;
      for (const key of BLOOM_KEYS) entry.bloom[key] += Number(bt[key]) || 0;

      entry.coveredTopics.add(bt.topicId);
      entry.topicQuestionMap.set(bt.topicId, (entry.topicQuestionMap.get(bt.topicId) || 0) + questions);

      const linkedLos = bt.topic.los || [];
      if (linkedLos.length === 0) continue;
      const splitQuestions = questions / linkedLos.length;
      for (const tl of linkedLos) {
        entry.coveredLOs.add(tl.learningOutcomeId);
        entry.loQuestionMap.set(tl.learningOutcomeId, (entry.loQuestionMap.get(tl.learningOutcomeId) || 0) + splitQuestions);
      }
    }
  }

  return Array.from(courseMap.values())
    .map((c) => {
      const lowOrderThinking = c.bloom.bloomRemember + c.bloom.bloomUnderstand + c.bloom.bloomApply;
      const highOrderThinking = c.bloom.bloomAnalyze + c.bloom.bloomEvaluate + c.bloom.bloomCreate;
      const bloomTotal = lowOrderThinking + highOrderThinking;
      const formatQuestionTotal = entryQuestionFormatTotal(c.questionFormats);
      const formatWeightTotal = c.questionFormats.closedEnded.gradeWeight + c.questionFormats.openEnded.gradeWeight;
      const loDetails = c.loList.map((lo: any) => ({
        ...lo,
        covered: c.coveredLOs.has(lo.id),
        questionCount: Number((c.loQuestionMap.get(lo.id) || 0).toFixed(1)),
      }));
      const topicDetails = c.topicList.map((topic: any) => ({
        ...topic,
        covered: c.coveredTopics.has(topic.id),
        questionCount: c.topicQuestionMap.get(topic.id) || 0,
      }));

      return {
        courseId: c.courseId,
        courseOfferingId: c.courseOfferingId,
        courseCode: c.courseCode,
        courseName: c.courseName,
        majorId: c.majorId,
        majorName: c.majorName,
        term: c.term,
        blueprintCount: c.blueprintCount,
        blueprintQuestions: c.blueprintQuestions,
        totalQuestions: c.totalQuestions,
        bloom: c.bloom,
        questionFormats: {
          closedEndedQuestions: c.questionFormats.closedEnded.questionCount,
          openEndedQuestions: c.questionFormats.openEnded.questionCount,
          closedEndedQuestionPercent: pct(c.questionFormats.closedEnded.questionCount, formatQuestionTotal),
          openEndedQuestionPercent: pct(c.questionFormats.openEnded.questionCount, formatQuestionTotal),
          closedEndedGradeWeight: Math.round(c.questionFormats.closedEnded.gradeWeight * 10) / 10,
          openEndedGradeWeight: Math.round(c.questionFormats.openEnded.gradeWeight * 10) / 10,
          closedEndedGradeWeightPercent: pct(c.questionFormats.closedEnded.gradeWeight, formatWeightTotal),
          openEndedGradeWeightPercent: pct(c.questionFormats.openEnded.gradeWeight, formatWeightTotal),
        },
        lowOrderThinkingPercent: pct(lowOrderThinking, bloomTotal),
        highOrderThinkingPercent: pct(highOrderThinking, bloomTotal),
        cloCoverage: {
          covered: c.coveredLOs.size,
          total: c.loList.length,
          percent: pct(c.coveredLOs.size, c.loList.length),
        },
        topicCoverage: {
          covered: c.coveredTopics.size,
          total: c.topicList.length,
          percent: pct(c.coveredTopics.size, c.topicList.length),
        },
        loDetails,
        topicDetails,
      };
    })
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
}

function entryQuestionFormatTotal(questionFormats: Record<string, QuestionFormatSummary>) {
  return questionFormats.closedEnded.questionCount + questionFormats.openEnded.questionCount;
}

function buildProgramSummary(courseStats: any[]) {
  const majorMap = new Map<string, any>();
  for (const course of courseStats) {
    let major = majorMap.get(course.majorId);
    if (!major) {
      major = {
        majorId: course.majorId,
        majorName: course.majorName,
        courseCount: 0,
        blueprintCount: 0,
        totalQuestions: 0,
        cloSum: 0,
        topicSum: 0,
        highOrderSum: 0,
        openEndedQuestionSum: 0,
      };
      majorMap.set(course.majorId, major);
    }
    major.courseCount++;
    major.blueprintCount += course.blueprintCount;
    major.totalQuestions += course.totalQuestions;
    major.cloSum += course.cloCoverage.percent;
    major.topicSum += course.topicCoverage.percent;
    major.highOrderSum += course.highOrderThinkingPercent;
    major.openEndedQuestionSum += course.questionFormats.openEndedQuestionPercent || 0;
  }

  return Array.from(majorMap.values())
    .map((major) => ({
      majorId: major.majorId,
      majorName: major.majorName,
      courseCount: major.courseCount,
      blueprintCount: major.blueprintCount,
      totalQuestions: major.totalQuestions,
      avgCLOCoverage: pct(major.cloSum, major.courseCount * 100),
      avgTopicCoverage: pct(major.topicSum, major.courseCount * 100),
      avgHighOrderThinking: pct(major.highOrderSum, major.courseCount * 100),
      avgOpenEndedQuestions: pct(major.openEndedQuestionSum, major.courseCount * 100),
    }))
    .sort((a, b) => a.majorName.localeCompare(b.majorName));
}

function buildOverview(courseStats: any[]) {
  const bloom = emptyBloom();
  let totalQuestions = 0;
  let blueprintCount = 0;
  let cloGaps = 0;
  let topicGaps = 0;
  let closedEndedQuestions = 0;
  let openEndedQuestions = 0;
  for (const course of courseStats) {
    totalQuestions += course.totalQuestions;
    blueprintCount += course.blueprintCount;
    cloGaps += Math.max(0, course.cloCoverage.total - course.cloCoverage.covered);
    topicGaps += Math.max(0, course.topicCoverage.total - course.topicCoverage.covered);
    closedEndedQuestions += course.questionFormats.closedEndedQuestions || 0;
    openEndedQuestions += course.questionFormats.openEndedQuestions || 0;
    for (const key of BLOOM_KEYS) bloom[key] += course.bloom[key] || 0;
  }

  const lowOrderThinking = bloom.bloomRemember + bloom.bloomUnderstand + bloom.bloomApply;
  const highOrderThinking = bloom.bloomAnalyze + bloom.bloomEvaluate + bloom.bloomCreate;
  const bloomTotal = lowOrderThinking + highOrderThinking;
  const courseCount = courseStats.length;

  return {
    courseCount,
    blueprintCount,
    totalQuestions,
    cloGaps,
    topicGaps,
    avgCLOCoverage: courseCount > 0 ? Math.round(courseStats.reduce((sum, c) => sum + c.cloCoverage.percent, 0) / courseCount) : 0,
    avgTopicCoverage: courseCount > 0 ? Math.round(courseStats.reduce((sum, c) => sum + c.topicCoverage.percent, 0) / courseCount) : 0,
    lowOrderThinkingPercent: pct(lowOrderThinking, bloomTotal),
    highOrderThinkingPercent: pct(highOrderThinking, bloomTotal),
    closedEndedQuestionPercent: pct(closedEndedQuestions, closedEndedQuestions + openEndedQuestions),
    openEndedQuestionPercent: pct(openEndedQuestions, closedEndedQuestions + openEndedQuestions),
  };
}

function countReportResponses(responses: unknown) {
  if (!responses || typeof responses !== "object") return 0;
  const responseMap = responses as Record<string, unknown>;
  return COURSE_PROGRESS_REPORT_PROMPTS.filter((prompt) => {
    const value = responseMap[prompt.key];
    return typeof value === "string" && value.trim().length > 0;
  }).length;
}

function buildCourseReportProgramSummary(reportStats: any[]) {
  const majorMap = new Map<string, any>();
  for (const report of reportStats) {
    let major = majorMap.get(report.majorId);
    if (!major) {
      major = {
        majorId: report.majorId,
        majorName: report.majorName,
        courses: 0,
        approvedReports: 0,
        pendingReports: 0,
        needsRevisionReports: 0,
        missingApprovedReports: 0,
        completionSum: 0,
      };
      majorMap.set(report.majorId, major);
    }
    major.courses++;
    if (report.status === "APPROVED") major.approvedReports++;
    if (report.status === "SUBMITTED") major.pendingReports++;
    if (report.status === "NEEDS_REVISION") major.needsRevisionReports++;
    if (report.status !== "APPROVED") major.missingApprovedReports++;
    major.completionSum += report.responseCompletionPercent;
  }

  return Array.from(majorMap.values())
    .map((major) => ({
      majorId: major.majorId,
      majorName: major.majorName,
      courses: major.courses,
      approvedReports: major.approvedReports,
      pendingReports: major.pendingReports,
      needsRevisionReports: major.needsRevisionReports,
      missingApprovedReports: major.missingApprovedReports,
      avgResponseCompletion: major.courses > 0 ? Math.round(major.completionSum / major.courses) : 0,
    }))
    .sort((a, b) => a.majorName.localeCompare(b.majorName));
}

function buildCourseReportOverview(reportStats: any[]) {
  const overview = {
    offeringCount: reportStats.length,
    approvedReports: 0,
    missingApprovedReports: 0,
    pendingReports: 0,
    needsRevisionReports: 0,
    draftReports: 0,
    notStartedReports: 0,
    avgResponseCompletion: 0,
  };

  let completionSum = 0;
  for (const report of reportStats) {
    if (report.status === "APPROVED") overview.approvedReports++;
    if (report.status === "SUBMITTED") overview.pendingReports++;
    if (report.status === "NEEDS_REVISION") overview.needsRevisionReports++;
    if (report.status === "DRAFT") overview.draftReports++;
    if (report.status === "NOT_STARTED") overview.notStartedReports++;
    if (report.status !== "APPROVED") overview.missingApprovedReports++;
    completionSum += report.responseCompletionPercent;
  }

  overview.avgResponseCompletion = reportStats.length > 0 ? Math.round(completionSum / reportStats.length) : 0;
  return overview;
}

async function getCourseReportAnalytics({
  selectedTerm,
  majorId,
  courseId,
}: {
  selectedTerm: { id: string } | null | undefined;
  majorId?: string;
  courseId?: string;
}) {
  const offerings = selectedTerm
    ? await prisma.courseOffering.findMany({
        where: {
          termId: selectedTerm.id,
          course: {
            ...(majorId ? { majorId } : {}),
            ...(courseId ? { id: courseId } : {}),
          },
        },
        include: {
          term: true,
          course: { include: { major: { select: { id: true, name: true } } } },
          instructors: { include: { instructor: { select: { name: true } } } },
          courseReport: { include: { instructor: { select: { name: true } } } },
          _count: { select: { enrollments: true } },
        },
        orderBy: [{ course: { code: "asc" } }],
      })
    : [];

  const totalResponses = COURSE_PROGRESS_REPORT_PROMPTS.length;
  const courseReportStats = offerings.map((offering) => {
    const report = offering.courseReport;
    const answeredResponses = countReportResponses(report?.responses);
    const instructorNames =
      offering.instructors.length > 0
        ? offering.instructors.map(({ instructor }) => instructor.name)
        : report
          ? [report.instructor.name]
          : [];

    return {
      courseOfferingId: offering.id,
      courseId: offering.courseId,
      courseCode: offering.course.code,
      courseName: offering.course.name,
      majorId: offering.course.major.id,
      majorName: offering.course.major.name,
      term: offering.term,
      instructorNames,
      rosterSize: offering._count.enrollments,
      reportId: report?.id ?? null,
      status: report?.status ?? "NOT_STARTED",
      answeredResponses,
      totalResponses,
      responseCompletionPercent: pct(answeredResponses, totalResponses),
      submittedAt: report?.submittedAt ?? null,
      reviewedAt: report?.reviewedAt ?? null,
      official: report?.status === "APPROVED",
    };
  });

  return {
    courseReportStats,
    courseReportOverview: buildCourseReportOverview(courseReportStats),
    courseReportProgramSummary: buildCourseReportProgramSummary(courseReportStats),
  };
}

function sortTrendTerms(a: any, b: any) {
  const year = String(a.academicYear || "").localeCompare(String(b.academicYear || ""));
  if (year !== 0) return year;
  return (SEMESTER_ORDER[a.semester || ""] || 99) - (SEMESTER_ORDER[b.semester || ""] || 99);
}

async function getBlueprints(where: Record<string, unknown>) {
  return prisma.blueprint.findMany({
    where,
    include: {
      courseOffering: { include: { term: true } },
      course: {
        include: {
          major: { select: { id: true, name: true } },
          topics: { select: { id: true, name: true, syllabusId: true } },
          los: { select: { id: true, code: true, description: true, syllabusId: true } },
          syllabi: {
            include: {
              topics: { select: { id: true, name: true } },
              los: { select: { id: true, code: true, description: true } },
            },
          },
        },
      },
      topics: {
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              los: { select: { learningOutcomeId: true } },
            },
          },
        },
      },
      questionFormats: true,
    },
  });
}

export async function GET(req: NextRequest) {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const view = req.nextUrl.searchParams.get("view") || "current";
  const majorId = req.nextUrl.searchParams.get("majorId") || undefined;
  const courseId = req.nextUrl.searchParams.get("courseId") || undefined;
  const termId = req.nextUrl.searchParams.get("termId") || undefined;

  const [activeTerm, terms, majors, courses] = await Promise.all([
    prisma.academicTerm.findFirst({ where: { isActive: true }, orderBy: { activatedAt: "desc" } }),
    prisma.academicTerm.findMany({ orderBy: [{ academicYear: "asc" }, { semester: "asc" }] }),
    prisma.major.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({
      where: majorId ? { majorId } : {},
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, majorId: true },
    }),
  ]);

  const selectedTerm = termId ? terms.find((term) => term.id === termId) ?? activeTerm : activeTerm;
  const baseWhere: Record<string, unknown> = { status: "APPROVED" };
  if (majorId) baseWhere.course = { majorId };
  if (courseId) baseWhere.courseId = courseId;

  if (view === "trends") {
    const trendBlueprints = await getBlueprints(baseWhere);

    const termMap = new Map<string, any[]>();
    for (const bp of trendBlueprints) {
      const term = getBlueprintTerm(bp);
      if (!term.semester || !term.academicYear) continue;
      const key = term.id ?? `${term.semester}|${term.academicYear}`;
      if (!termMap.has(key)) termMap.set(key, []);
      termMap.get(key)!.push(bp);
    }

    const trends = Array.from(termMap.entries())
      .map(([key, blueprints]) => {
        const term = getBlueprintTerm(blueprints[0]);
        const stats = buildCourseStats(blueprints);
        const overview = buildOverview(stats);
        return {
          key,
          termId: term.id,
          semester: term.semester,
          academicYear: term.academicYear,
          label: termLabel(term),
          blueprintCount: overview.blueprintCount,
          totalQuestions: overview.totalQuestions,
          cloCoveragePercent: overview.avgCLOCoverage,
          topicCoveragePercent: overview.avgTopicCoverage,
          lowOrderThinkingPercent: overview.lowOrderThinkingPercent,
          highOrderThinkingPercent: overview.highOrderThinkingPercent,
        };
      })
      .sort(sortTrendTerms);

    return NextResponse.json({
      activeTerm,
      selectedTerm,
      terms,
      trends,
      filters: { majors, courses },
    });
  }

  const where: Record<string, unknown> = { ...baseWhere };
  if (selectedTerm) {
    where.OR = [
      { courseOffering: { is: { termId: selectedTerm.id } } },
      {
        courseOfferingId: null,
        semester: selectedTerm.semester,
        academicYear: selectedTerm.academicYear,
      },
    ];
  }

  const blueprints = await getBlueprints(where);
  const courseStats = buildCourseStats(blueprints);
  const programSummary = buildProgramSummary(courseStats);
  const courseReportAnalytics = await getCourseReportAnalytics({ selectedTerm, majorId, courseId });

  return NextResponse.json({
    activeTerm,
    selectedTerm,
    terms,
    courseStats,
    programSummary,
    overview: buildOverview(courseStats),
    ...courseReportAnalytics,
    filters: { majors, courses },
  });
}
