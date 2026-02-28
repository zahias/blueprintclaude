import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const semester = req.nextUrl.searchParams.get("semester") || undefined;
  const academicYear = req.nextUrl.searchParams.get("academicYear") || undefined;
  const majorId = req.nextUrl.searchParams.get("majorId") || undefined;
  const courseId = req.nextUrl.searchParams.get("courseId") || undefined;

  // ─── Build base where clause (only APPROVED blueprints matter) ────────────
  const where: Record<string, unknown> = { status: "APPROVED" };
  if (semester) where.semester = semester;
  if (academicYear) where.academicYear = academicYear;
  if (courseId) where.courseId = courseId;
  if (majorId) where.course = { majorId };

  // ─── Fetch all matching blueprints with deep includes ─────────────────────
  const blueprints = await prisma.blueprint.findMany({
    where,
    include: {
      course: {
        include: {
          major: { select: { id: true, name: true } },
          topics: { select: { id: true, name: true, los: { select: { learningOutcomeId: true } } } },
          los: { select: { id: true, code: true, description: true } },
        },
      },
      topics: {
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              los: { select: { learningOutcomeId: true, learningOutcome: { select: { code: true } } } },
            },
          },
          questionTypes: { select: { questionType: true, count: true } },
        },
      },
    },
  });

  // ─── Per-course aggregation ───────────────────────────────────────────────
  const courseMap = new Map<string, {
    courseId: string;
    courseCode: string;
    courseName: string;
    majorId: string;
    majorName: string;
    blueprintCount: number;
    totalMarks: number;
    totalQuestions: number;
    bloom: Record<string, number>;
    qTypes: Record<string, number>;
    coveredLOs: Set<string>;
    totalLOs: number;
    loList: { id: string; code: string; description: string; covered: boolean }[];
    coveredTopics: Set<string>;
    totalTopics: number;
    topicList: { id: string; name: string; covered: boolean }[];
  }>();

  for (const bp of blueprints) {
    let entry = courseMap.get(bp.courseId);
    if (!entry) {
      entry = {
        courseId: bp.courseId,
        courseCode: bp.course.code,
        courseName: bp.course.name,
        majorId: bp.course.major.id,
        majorName: bp.course.major.name,
        blueprintCount: 0,
        totalMarks: 0,
        totalQuestions: 0,
        bloom: { bloomRemember: 0, bloomUnderstand: 0, bloomApply: 0, bloomAnalyze: 0, bloomEvaluate: 0, bloomCreate: 0 },
        qTypes: {},
        coveredLOs: new Set(),
        totalLOs: bp.course.los.length,
        loList: bp.course.los.map((lo) => ({ id: lo.id, code: lo.code, description: lo.description, covered: false })),
        coveredTopics: new Set(),
        totalTopics: bp.course.topics.length,
        topicList: bp.course.topics.map((t) => ({ id: t.id, name: t.name, covered: false })),
      };
      courseMap.set(bp.courseId, entry);
    }

    entry.blueprintCount++;
    entry.totalMarks += bp.totalMarks;

    for (const bt of bp.topics) {
      entry.totalQuestions += bt.questionCount;
      entry.bloom.bloomRemember += bt.bloomRemember;
      entry.bloom.bloomUnderstand += bt.bloomUnderstand;
      entry.bloom.bloomApply += bt.bloomApply;
      entry.bloom.bloomAnalyze += bt.bloomAnalyze;
      entry.bloom.bloomEvaluate += bt.bloomEvaluate;
      entry.bloom.bloomCreate += bt.bloomCreate;

      // Track covered topics
      entry.coveredTopics.add(bt.topicId);

      // Track covered LOs via topic → LO links
      for (const tl of bt.topic.los) {
        entry.coveredLOs.add(tl.learningOutcomeId);
      }

      // Q-type aggregation
      for (const qt of bt.questionTypes) {
        entry.qTypes[qt.questionType] = (entry.qTypes[qt.questionType] || 0) + qt.count;
      }
    }
  }

  // Finalize coverage flags
  const courseStats = Array.from(courseMap.values()).map((c) => {
    const lot = c.bloom.bloomRemember + c.bloom.bloomUnderstand + c.bloom.bloomApply;
    const hot = c.bloom.bloomAnalyze + c.bloom.bloomEvaluate + c.bloom.bloomCreate;
    const total = lot + hot;
    return {
      courseId: c.courseId,
      courseCode: c.courseCode,
      courseName: c.courseName,
      majorId: c.majorId,
      majorName: c.majorName,
      blueprintCount: c.blueprintCount,
      totalMarks: c.totalMarks,
      totalQuestions: c.totalQuestions,
      bloom: c.bloom,
      hotPercent: total > 0 ? Math.round((hot / total) * 100) : 0,
      lotPercent: total > 0 ? Math.round((lot / total) * 100) : 0,
      qTypes: c.qTypes,
      cloCoverage: { covered: c.coveredLOs.size, total: c.totalLOs, percent: c.totalLOs > 0 ? Math.round((c.coveredLOs.size / c.totalLOs) * 100) : 0 },
      topicCoverage: { covered: c.coveredTopics.size, total: c.totalTopics, percent: c.totalTopics > 0 ? Math.round((c.coveredTopics.size / c.totalTopics) * 100) : 0 },
      loDetails: c.loList.map((lo) => ({ ...lo, covered: c.coveredLOs.has(lo.id) })),
      topicDetails: c.topicList.map((t) => ({ ...t, covered: c.coveredTopics.has(t.id) })),
    };
  });

  // ─── Per-major aggregation ─────────────────────────────────────────────────
  const majorMap = new Map<string, { majorId: string; majorName: string; courseCount: number; blueprintCount: number; hotSum: number; cloCoverageSum: number; topicCoverageSum: number }>();
  for (const cs of courseStats) {
    let m = majorMap.get(cs.majorId);
    if (!m) { m = { majorId: cs.majorId, majorName: cs.majorName, courseCount: 0, blueprintCount: 0, hotSum: 0, cloCoverageSum: 0, topicCoverageSum: 0 }; majorMap.set(cs.majorId, m); }
    m.courseCount++;
    m.blueprintCount += cs.blueprintCount;
    m.hotSum += cs.hotPercent;
    m.cloCoverageSum += cs.cloCoverage.percent;
    m.topicCoverageSum += cs.topicCoverage.percent;
  }
  const majorStats = Array.from(majorMap.values()).map((m) => ({
    majorId: m.majorId,
    majorName: m.majorName,
    courseCount: m.courseCount,
    blueprintCount: m.blueprintCount,
    avgHOTPercent: m.courseCount > 0 ? Math.round(m.hotSum / m.courseCount) : 0,
    avgCLOCoverage: m.courseCount > 0 ? Math.round(m.cloCoverageSum / m.courseCount) : 0,
    avgTopicCoverage: m.courseCount > 0 ? Math.round(m.topicCoverageSum / m.courseCount) : 0,
  }));

  // ─── Trend data: per-semester/year stats for a specific course ─────────────
  // (only relevant when courseId is set — otherwise empty)
  let bloomTrend: { semester: string; academicYear: string; bloom: Record<string, number>; totalQ: number; hotPercent: number; lotPercent: number }[] = [];
  let qTypeTrend: { semester: string; academicYear: string; qTypes: Record<string, number>; totalQ: number }[] = [];

  if (courseId) {
    // Re-query without semester/year filters for trend
    const trendBluprints = await prisma.blueprint.findMany({
      where: { courseId, status: "APPROVED", semester: { not: null }, academicYear: { not: null } },
      include: {
        topics: {
          include: { questionTypes: { select: { questionType: true, count: true } } },
        },
      },
      orderBy: [{ academicYear: "asc" }, { semester: "asc" }],
    });

    const trendMap = new Map<string, { semester: string; academicYear: string; bloom: Record<string, number>; qTypes: Record<string, number>; totalQ: number }>();

    for (const bp of trendBluprints) {
      if (!bp.semester || !bp.academicYear) continue;
      const key = `${bp.academicYear}|${bp.semester}`;
      let t = trendMap.get(key);
      if (!t) {
        t = {
          semester: bp.semester,
          academicYear: bp.academicYear,
          bloom: { bloomRemember: 0, bloomUnderstand: 0, bloomApply: 0, bloomAnalyze: 0, bloomEvaluate: 0, bloomCreate: 0 },
          qTypes: {},
          totalQ: 0,
        };
        trendMap.set(key, t);
      }
      for (const bt of bp.topics) {
        t.totalQ += bt.questionCount;
        t.bloom.bloomRemember += bt.bloomRemember;
        t.bloom.bloomUnderstand += bt.bloomUnderstand;
        t.bloom.bloomApply += bt.bloomApply;
        t.bloom.bloomAnalyze += bt.bloomAnalyze;
        t.bloom.bloomEvaluate += bt.bloomEvaluate;
        t.bloom.bloomCreate += bt.bloomCreate;
        for (const qt of bt.questionTypes) {
          t.qTypes[qt.questionType] = (t.qTypes[qt.questionType] || 0) + qt.count;
        }
      }
    }

    const sorted = Array.from(trendMap.values());
    bloomTrend = sorted.map((t) => {
      const lot = t.bloom.bloomRemember + t.bloom.bloomUnderstand + t.bloom.bloomApply;
      const hot = t.bloom.bloomAnalyze + t.bloom.bloomEvaluate + t.bloom.bloomCreate;
      const total = lot + hot;
      return { ...t, hotPercent: total > 0 ? Math.round((hot / total) * 100) : 0, lotPercent: total > 0 ? Math.round((lot / total) * 100) : 0 };
    });
    qTypeTrend = sorted.map((t) => ({ semester: t.semester, academicYear: t.academicYear, qTypes: t.qTypes, totalQ: t.totalQ }));
  }

  // ─── Fetch all majors for filter dropdown ──────────────────────────────────
  const majors = await prisma.major.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  // ─── Fetch courses for filter dropdown (optionally filtered by major) ──────
  const coursesWhere: Record<string, unknown> = {};
  if (majorId) coursesWhere.majorId = majorId;
  const courses = await prisma.course.findMany({ where: coursesWhere, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, majorId: true } });

  return NextResponse.json({
    courseStats,
    majorStats,
    bloomTrend,
    qTypeTrend,
    filters: { majors, courses },
  });
}
