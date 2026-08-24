export const GRADE_SCALE = [
  { letter: "A", qualityPoints: 4, min: 90 },
  { letter: "A-", qualityPoints: 3.66, min: 87 },
  { letter: "B+", qualityPoints: 3.33, min: 83 },
  { letter: "B", qualityPoints: 3, min: 80 },
  { letter: "B-", qualityPoints: 2.66, min: 77 },
  { letter: "C+", qualityPoints: 2.33, min: 73 },
  { letter: "C", qualityPoints: 2, min: 70 },
  { letter: "C-", qualityPoints: 1.66, min: 67 },
  { letter: "D+", qualityPoints: 1.33, min: 63 },
  { letter: "D", qualityPoints: 1, min: 60 },
  { letter: "F", qualityPoints: 0, min: 0 },
] as const;

export type LetterGrade = (typeof GRADE_SCALE)[number]["letter"];

export interface GradeAssessmentForCalc {
  id: string;
  name?: string;
  weightPercent: number;
  maxPoints: number;
  status: string;
  entries: { studentId: string; rawPoints: number | null }[];
}

export interface GradeInsight {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  metricKey: string;
}

export function getLetterGrade(percent: number): { letter: LetterGrade; qualityPoints: number } {
  const bounded = Math.max(0, Math.min(100, percent));
  const grade = GRADE_SCALE.find((g) => bounded >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return { letter: grade.letter, qualityPoints: grade.qualityPoints };
}

export function getStudentWeightedPercent(studentId: string, assessments: GradeAssessmentForCalc[]): number {
  const total = assessments.reduce((sum, assessment) => {
    if (assessment.maxPoints <= 0) return sum;
    const entry = assessment.entries.find((e) => e.studentId === studentId);
    const rawPoints = entry?.rawPoints;
    if (rawPoints === null || rawPoints === undefined) return sum;
    const earnedPercent = Math.max(0, Math.min(assessment.maxPoints, rawPoints)) / assessment.maxPoints;
    return sum + earnedPercent * assessment.weightPercent;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function getGradeDistribution(percents: number[]): Record<LetterGrade, number> {
  const distribution = Object.fromEntries(GRADE_SCALE.map((g) => [g.letter, 0])) as Record<LetterGrade, number>;
  percents.forEach((percent) => {
    distribution[getLetterGrade(percent).letter]++;
  });
  return distribution;
}

export function getGradeStats(percents: number[]) {
  if (percents.length === 0) {
    return { average: 0, median: 0, highest: 0, lowest: 0, standardDeviation: 0, passCount: 0, failCount: 0 };
  }
  const sorted = [...percents].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const average = percents.reduce((sum, value) => sum + value, 0) / percents.length;
  const variance = percents.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / percents.length;
  return {
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    highest: sorted[sorted.length - 1],
    lowest: sorted[0],
    standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
    passCount: percents.filter((value) => value >= 60).length,
    failCount: percents.filter((value) => value < 60).length,
  };
}

export function assessmentWeightTotal(assessments: { weightPercent: number }[]): number {
  return Math.round(assessments.reduce((sum, assessment) => sum + assessment.weightPercent, 0) * 100) / 100;
}

export function getGradeInsights(
  percents: number[],
  assessments: GradeAssessmentForCalc[] = [],
  studentCount = percents.length
): GradeInsight[] {
  const insights: GradeInsight[] = [];
  if (percents.length === 0) {
    return [{
      severity: "info",
      title: "No grade data yet",
      detail: "Enter or import grades to generate distribution insights.",
      metricKey: "no-data",
    }];
  }

  const stats = getGradeStats(percents);
  const distribution = getGradeDistribution(percents);
  const failRate = studentCount > 0 ? stats.failCount / studentCount : 0;
  const highGradeRate = studentCount > 0 ? ((distribution.A || 0) + (distribution["A-"] || 0)) / studentCount : 0;
  const expectedCells = assessments.length * studentCount;
  const missingCells = assessments.reduce(
    (sum, assessment) => sum + assessment.entries.filter((entry) => entry.rawPoints === null || entry.rawPoints === undefined).length,
    0
  );
  const missingRate = expectedCells > 0 ? missingCells / expectedCells : 0;

  if (stats.failCount === 0 && studentCount >= 10) {
    insights.push({
      severity: "warning",
      title: "No failing grades",
      detail: "There are no F grades. This may be valid, but review whether the assessment difficulty and grading scale are appropriate.",
      metricKey: "no-fails",
    });
  }
  if (failRate > 0.25) {
    insights.push({
      severity: "critical",
      title: "High fail rate",
      detail: `${Math.round(failRate * 100)}% of students are below 60%. Review assessment difficulty, grading entry, and student support needs.`,
      metricKey: "high-fail-rate",
    });
  }
  if (stats.average > 88) {
    insights.push({
      severity: "warning",
      title: "Grades are shifted high",
      detail: `The class average is ${stats.average}%. Check whether the distribution is too far to the right.`,
      metricKey: "high-average",
    });
  }
  if (stats.average < 65) {
    insights.push({
      severity: "critical",
      title: "Grades are shifted low",
      detail: `The class average is ${stats.average}%. Check whether the distribution is too far to the left.`,
      metricKey: "low-average",
    });
  }
  if (Math.abs(stats.average - stats.median) > 8) {
    insights.push({
      severity: "warning",
      title: "Skewed distribution",
      detail: `Average and median differ by more than 8 points (${stats.average}% vs ${stats.median}%). Look for outliers or clustered scores.`,
      metricKey: "skew",
    });
  }
  if (stats.standardDeviation < 6 && studentCount >= 10) {
    insights.push({
      severity: "warning",
      title: "Very narrow spread",
      detail: `Standard deviation is ${stats.standardDeviation}. Scores are tightly clustered, which may hide performance differences.`,
      metricKey: "low-stddev",
    });
  }
  if (stats.standardDeviation > 18) {
    insights.push({
      severity: "warning",
      title: "Very wide spread",
      detail: `Standard deviation is ${stats.standardDeviation}. Review whether some students or sections need attention.`,
      metricKey: "high-stddev",
    });
  }
  if (highGradeRate > 0.4) {
    insights.push({
      severity: "warning",
      title: "Large A/A- cluster",
      detail: `${Math.round(highGradeRate * 100)}% of students are in A or A-. Review whether top grades are overly concentrated.`,
      metricKey: "high-grade-cluster",
    });
  }
  if (missingRate > 0.3) {
    insights.push({
      severity: "critical",
      title: "Many missing grade cells",
      detail: `${Math.round(missingRate * 100)}% of grade cells are blank. Complete missing entries before submission.`,
      metricKey: "missing-cells",
    });
  }

  for (const assessment of assessments) {
    const values = assessment.entries
      .map((entry) => entry.rawPoints)
      .filter((value): value is number => value !== null && value !== undefined);
    if (values.length < 5 || assessment.maxPoints <= 0) continue;
    const low = values.filter((value) => value / assessment.maxPoints < 0.6).length / values.length;
    const high = values.filter((value) => value / assessment.maxPoints >= 0.9).length / values.length;
    if (low > 0.45 || high > 0.55) {
      insights.push({
        severity: low > 0.45 ? "critical" : "warning",
        title: `${assessment.name || "Assessment"} score cluster`,
        detail: low > 0.45
          ? `${Math.round(low * 100)}% of entered scores are below 60% on this assessment.`
          : `${Math.round(high * 100)}% of entered scores are 90% or higher on this assessment.`,
        metricKey: `assessment-cluster-${assessment.id}`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      severity: "info",
      title: "Distribution looks balanced",
      detail: "No major grade distribution warnings were detected from the current entries.",
      metricKey: "balanced",
    });
  }
  return insights;
}
