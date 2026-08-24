import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedAdmin } from "@/lib/session.server";
import { assessmentWeightTotal, getGradeInsights, getGradeStats, getStudentWeightedPercent } from "@/lib/grades";

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export async function GET(req: NextRequest) {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const termId = req.nextUrl.searchParams.get("termId") || undefined;
  const majorId = req.nextUrl.searchParams.get("majorId") || undefined;
  const courseId = req.nextUrl.searchParams.get("courseId") || undefined;

  const activeTerm = await prisma.academicTerm.findFirst({ where: { isActive: true }, orderBy: { activatedAt: "desc" } });
  const selectedTermId = termId || activeTerm?.id;

  const offerings = selectedTermId ? await prisma.courseOffering.findMany({
    where: {
      termId: selectedTermId,
      gradebook: { status: "APPROVED" },
      course: {
        ...(majorId ? { majorId } : {}),
        ...(courseId ? { id: courseId } : {}),
      },
    },
    include: {
      term: true,
      course: { include: { major: { select: { id: true, name: true } } } },
      enrollments: { include: { student: true } },
      gradebook: true,
      gradeAssessments: {
        include: { entries: true },
        orderBy: { createdAt: "asc" },
      },
    },
  }) : [];

  const courseStats = offerings.map((offering) => {
    const assessments = offering.gradeAssessments.map((assessment) => ({
      id: assessment.id,
      name: assessment.name,
      weightPercent: assessment.weightPercent,
      maxPoints: assessment.maxPoints,
      status: assessment.status,
      entries: assessment.entries,
    }));
    const percents = offering.enrollments.map((enrollment) => getStudentWeightedPercent(enrollment.studentId, assessments));
    const stats = getGradeStats(percents);
    const expectedCells = offering.enrollments.length * assessments.length;
    const filledCells = assessments.reduce((sum, assessment) => sum + assessment.entries.filter((entry) => entry.rawPoints !== null && entry.rawPoints !== undefined).length, 0);
    return {
      courseOfferingId: offering.id,
      courseId: offering.courseId,
      courseCode: offering.course.code,
      courseName: offering.course.name,
      majorId: offering.course.major.id,
      majorName: offering.course.major.name,
      rosterSize: offering.enrollments.length,
      approvedAssessments: assessments.length,
      completionPercent: pct(filledCells, expectedCells),
      percents,
      stats,
      failRate: pct(stats.failCount, offering.enrollments.length),
      insights: getGradeInsights(percents, assessments, offering.enrollments.length),
      gradebookStatus: offering.gradebook?.status || "DRAFT",
      analyzable: assessmentWeightTotal(assessments) === 100,
    };
  }).filter((course) => course.approvedAssessments > 0 && course.analyzable);

  const allPercents = courseStats.flatMap((course) => course.percents);
  const majorMap = new Map<string, any>();
  courseStats.forEach((course) => {
    let major = majorMap.get(course.majorId);
    if (!major) {
      major = { majorId: course.majorId, majorName: course.majorName, courses: 0, students: 0, assessments: 0, averageSum: 0, failRateSum: 0, completionSum: 0 };
      majorMap.set(course.majorId, major);
    }
    major.courses++;
    major.students += course.rosterSize;
    major.assessments += course.approvedAssessments;
    major.averageSum += course.stats.average;
    major.failRateSum += course.failRate;
    major.completionSum += course.completionPercent;
  });

  const majorSummary = Array.from(majorMap.values()).map((major) => ({
    majorId: major.majorId,
    majorName: major.majorName,
    courses: major.courses,
    students: major.students,
    approvedAssessments: major.assessments,
    average: major.courses > 0 ? Math.round(major.averageSum / major.courses * 100) / 100 : 0,
    failRate: major.courses > 0 ? Math.round(major.failRateSum / major.courses) : 0,
    completionPercent: major.courses > 0 ? Math.round(major.completionSum / major.courses) : 0,
  })).sort((a, b) => a.majorName.localeCompare(b.majorName));

  const [terms, majors, courses] = await Promise.all([
    prisma.academicTerm.findMany({ orderBy: [{ academicYear: "asc" }, { semester: "asc" }] }),
    prisma.major.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({ where: majorId ? { majorId } : {}, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, majorId: true } }),
  ]);

  return NextResponse.json({
    activeTerm,
    selectedTerm: terms.find((term) => term.id === selectedTermId) || activeTerm,
    overview: getGradeStats(allPercents),
    percents: allPercents,
    courseStats,
    majorSummary,
    filters: { terms, majors, courses },
  });
}
