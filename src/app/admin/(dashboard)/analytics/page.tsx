"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GradeDistributionChart from "@/components/GradeDistributionChart";
import { BLOOM_LEVELS } from "@/lib/constants";

interface TermInfo {
  id: string;
  semester: string;
  academicYear: string;
}

interface LODetail {
  id: string;
  code: string;
  description: string;
  covered: boolean;
  questionCount: number;
}

interface TopicDetail {
  id: string;
  name: string;
  covered: boolean;
  questionCount: number;
}

interface CourseStat {
  courseId: string;
  courseOfferingId: string | null;
  courseCode: string;
  courseName: string;
  majorId: string;
  majorName: string;
  term: { id: string | null; semester: string | null; academicYear: string | null };
  blueprintCount: number;
  blueprintQuestions: number;
  totalQuestions: number;
  bloom: Record<string, number>;
  questionFormats: {
    closedEndedQuestions: number;
    openEndedQuestions: number;
    closedEndedQuestionPercent: number;
    openEndedQuestionPercent: number;
    closedEndedGradeWeight: number;
    openEndedGradeWeight: number;
    closedEndedGradeWeightPercent: number;
    openEndedGradeWeightPercent: number;
  };
  lowOrderThinkingPercent: number;
  highOrderThinkingPercent: number;
  cloCoverage: { covered: number; total: number; percent: number };
  topicCoverage: { covered: number; total: number; percent: number };
  loDetails: LODetail[];
  topicDetails: TopicDetail[];
}

interface ProgramSummary {
  majorId: string;
  majorName: string;
  courseCount: number;
  blueprintCount: number;
  totalQuestions: number;
  avgCLOCoverage: number;
  avgTopicCoverage: number;
  avgHighOrderThinking: number;
  avgOpenEndedQuestions: number;
}

interface Overview {
  courseCount: number;
  blueprintCount: number;
  totalQuestions: number;
  cloGaps: number;
  topicGaps: number;
  avgCLOCoverage: number;
  avgTopicCoverage: number;
  lowOrderThinkingPercent: number;
  highOrderThinkingPercent: number;
  closedEndedQuestionPercent: number;
  openEndedQuestionPercent: number;
}

interface CourseReportStat {
  courseOfferingId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  majorId: string;
  majorName: string;
  term: TermInfo;
  instructorNames: string[];
  rosterSize: number;
  reportId: string | null;
  status: string;
  answeredResponses: number;
  totalResponses: number;
  responseCompletionPercent: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  official: boolean;
}

interface CourseReportOverview {
  offeringCount: number;
  approvedReports: number;
  missingApprovedReports: number;
  pendingReports: number;
  needsRevisionReports: number;
  draftReports: number;
  notStartedReports: number;
  avgResponseCompletion: number;
}

interface CourseReportProgramSummary {
  majorId: string;
  majorName: string;
  courses: number;
  approvedReports: number;
  pendingReports: number;
  needsRevisionReports: number;
  missingApprovedReports: number;
  avgResponseCompletion: number;
}

interface TrendPoint {
  key: string;
  termId: string | null;
  semester: string | null;
  academicYear: string | null;
  label: string;
  blueprintCount: number;
  totalQuestions: number;
  cloCoveragePercent: number;
  topicCoveragePercent: number;
  lowOrderThinkingPercent: number;
  highOrderThinkingPercent: number;
}

interface FilterOption {
  id: string;
  name: string;
  code?: string;
  majorId?: string;
}

interface AnalyticsData {
  activeTerm: TermInfo | null;
  selectedTerm: TermInfo | null;
  terms: TermInfo[];
  courseStats: CourseStat[];
  programSummary: ProgramSummary[];
  overview: Overview;
  courseReportStats: CourseReportStat[];
  courseReportOverview: CourseReportOverview;
  courseReportProgramSummary: CourseReportProgramSummary[];
  filters: { majors: FilterOption[]; courses: FilterOption[] };
}

interface TrendsData {
  trends: TrendPoint[];
  filters: { majors: FilterOption[]; courses: FilterOption[] };
}

interface GradeCourseStat {
  courseOfferingId: string;
  courseCode: string;
  courseName: string;
  majorId: string;
  majorName: string;
  rosterSize: number;
  approvedAssessments: number;
  completionPercent: number;
  failRate: number;
  stats: { average: number; median: number; highest: number; lowest: number; standardDeviation: number; passCount: number; failCount: number };
  insights: { severity: string; title: string; detail: string; metricKey: string }[];
}

interface GradeAnalyticsData {
  selectedTerm: TermInfo | null;
  overview: { average: number; median: number; highest: number; lowest: number; standardDeviation: number; passCount: number; failCount: number };
  percents: number[];
  courseStats: GradeCourseStat[];
  majorSummary: { majorId: string; majorName: string; courses: number; students: number; approvedAssessments: number; average: number; failRate: number; completionPercent: number }[];
  filters: { terms: TermInfo[]; majors: FilterOption[]; courses: FilterOption[] };
}

const TABS = [
  "Current Term Overview",
  "CLO Coverage",
  "Topic Coverage",
  "Bloom Balance",
  "Question Formats",
  "Readiness Gaps",
  "Trends",
  "Program Summary",
  "Course Reports",
  "Grade Analytics",
] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [gradeData, setGradeData] = useState<GradeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Current Term Overview");
  const [majorId, setMajorId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");

  const selectedMajor = useMemo(
    () => data?.filters.majors.find((major) => major.id === majorId),
    [data, majorId]
  );

  const filteredCourses = useMemo(
    () => data?.filters.courses.filter((course) => !majorId || course.majorId === majorId) || [],
    [data, majorId]
  );

  const riskyCourses = useMemo(() => {
    const courses = data?.courseStats || [];
    return courses.filter((course) => course.cloCoverage.percent < 100 || course.topicCoverage.percent < 100);
  }, [data]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (majorId) params.set("majorId", majorId);
    if (courseId) params.set("courseId", courseId);
    if (termId) params.set("termId", termId);
    const res = await fetch(`/api/admin/analytics?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [majorId, courseId, termId]);

  const loadTrends = useCallback(async () => {
    setTrendsLoading(true);
    const params = new URLSearchParams({ view: "trends" });
    if (majorId) params.set("majorId", majorId);
    if (courseId) params.set("courseId", courseId);
    const res = await fetch(`/api/admin/analytics?${params.toString()}`);
    if (res.ok) setTrendsData(await res.json());
    setTrendsLoading(false);
  }, [majorId, courseId]);

  const loadGradeData = useCallback(async () => {
    setGradesLoading(true);
    const params = new URLSearchParams();
    if (majorId) params.set("majorId", majorId);
    if (courseId) params.set("courseId", courseId);
    if (termId) params.set("termId", termId);
    const res = await fetch(`/api/admin/grade-analytics?${params.toString()}`);
    if (res.ok) setGradeData(await res.json());
    setGradesLoading(false);
  }, [majorId, courseId, termId]);

  useEffect(() => {
    loadData();
    loadTrends();
    loadGradeData();
  }, [loadData, loadTrends, loadGradeData]);

  useEffect(() => {
    if (majorId && courseId && !filteredCourses.some((course) => course.id === courseId)) {
      setCourseId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorId]);

  async function exportMajorReport() {
    setExportError("");
    if (!majorId || !selectedMajor || !data) {
      setExportError("Select a major before exporting a report.");
      return;
    }

    const majorCourses = data.courseStats.filter((course) => course.majorId === majorId);
    const majorCourseReports = data.courseReportStats.filter((report) => report.majorId === majorId);
    const summary = data.programSummary.find((major) => major.majorId === majorId);
    const reportSummary = data.courseReportProgramSummary.find((major) => major.majorId === majorId);
    const majorGradeCourses = (gradeData?.courseStats || []).filter((course) => course.majorId === majorId);
    const gradeSummary = gradeData?.majorSummary.find((major) => major.majorId === majorId);
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const term = data.selectedTerm ? `${data.selectedTerm.semester} ${data.selectedTerm.academicYear}` : "No active term";

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Program Blueprint Analytics Report", 14, 16);
    doc.setFontSize(11);
    doc.text(`${selectedMajor.name} | ${term}`, 14, 25);
    doc.setTextColor(31, 41, 55);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 44);
    doc.text(`Approved blueprints only. CLO question counts use split allocation for multi-CLO topics.`, 14, 51);

    autoTable(doc, {
      startY: 60,
      head: [["Courses", "Blueprints", "Questions", "Avg CLO Coverage", "Avg Topic Coverage", "Avg High Order Thinking"]],
      body: [[
        summary?.courseCount ?? 0,
        summary?.blueprintCount ?? 0,
        summary?.totalQuestions ?? 0,
        `${summary?.avgCLOCoverage ?? 0}%`,
        `${summary?.avgTopicCoverage ?? 0}%`,
        `${summary?.avgHighOrderThinking ?? 0}%`,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Course", "Blueprints", "Questions", "CLO Coverage", "Topic Coverage", "Low Order", "High Order"]],
      body: majorCourses.map((course) => [
        `${course.courseCode} - ${course.courseName}`,
        course.blueprintCount,
        course.totalQuestions,
        `${course.cloCoverage.covered}/${course.cloCoverage.total} (${course.cloCoverage.percent}%)`,
        `${course.topicCoverage.covered}/${course.topicCoverage.total} (${course.topicCoverage.percent}%)`,
        `${course.lowOrderThinkingPercent}%`,
        `${course.highOrderThinkingPercent}%`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [17, 24, 39] },
    });

    const gapRows = majorCourses
      .flatMap((course) => [
        ...course.loDetails.filter((lo) => !lo.covered).map((lo) => [`${course.courseCode}`, "CLO", lo.code, lo.description]),
        ...course.topicDetails.filter((topic) => !topic.covered).map((topic) => [`${course.courseCode}`, "Topic", topic.name, "Not covered in approved blueprints"]),
      ])
      .slice(0, 40);

    if (gapRows.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Course", "Gap Type", "Item", "Details"]],
        body: gapRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 38, 38] },
      });
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Course Progress Reports", "Approved", "Pending", "Needs Revision", "Missing Approved", "Avg Completion"]],
      body: [[
        reportSummary?.courses ?? 0,
        reportSummary?.approvedReports ?? 0,
        reportSummary?.pendingReports ?? 0,
        reportSummary?.needsRevisionReports ?? 0,
        reportSummary?.missingApprovedReports ?? 0,
        `${reportSummary?.avgResponseCompletion ?? 0}%`,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 118, 110] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Course", "Instructor", "Status", "Roster", "Responses", "Submitted", "Reviewed"]],
      body: majorCourseReports.map((report) => [
        `${report.courseCode} - ${report.courseName}`,
        report.instructorNames.join(", ") || "Unassigned",
        report.status.replace("_", " "),
        report.rosterSize,
        `${report.answeredResponses}/${report.totalResponses} (${report.responseCompletionPercent}%)`,
        report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : "-",
        report.reviewedAt ? new Date(report.reviewedAt).toLocaleDateString() : "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [17, 24, 39] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Grade Outcomes (Approved Gradebooks)", "Courses", "Students", "Average", "Fail Rate", "Completion"]],
      body: [[
        "Program",
        gradeSummary?.courses ?? 0,
        gradeSummary?.students ?? 0,
        `${gradeSummary?.average ?? 0}%`,
        `${gradeSummary?.failRate ?? 0}%`,
        `${gradeSummary?.completionPercent ?? 0}%`,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    if (majorGradeCourses.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Course", "Roster", "Approved Assessments", "Average", "Fail Rate", "Completion"]],
        body: majorGradeCourses.map((course) => [
          `${course.courseCode} - ${course.courseName}`,
          course.rosterSize,
          course.approvedAssessments,
          `${course.stats.average}%`,
          `${course.failRate}%`,
          `${course.completionPercent}%`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [17, 24, 39] },
      });
    } else {
      doc.setFontSize(9);
      doc.text("No approved gradebooks for this major yet.", 14, (doc as any).lastAutoTable.finalY + 8);
    }

    const fileName = `analytics-${selectedMajor.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${term.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
    doc.save(fileName);
  }

  function renderFilters() {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
            Showing {data?.selectedTerm ? `${data.selectedTerm.semester} ${data.selectedTerm.academicYear}` : "No active term"}
          </div>
          <select
            value={termId}
            onChange={(event) => setTermId(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Active Term</option>
            {data?.terms.map((term) => (
              <option key={term.id} value={term.id}>{term.semester} {term.academicYear}</option>
            ))}
          </select>
          <select
            value={majorId}
            onChange={(event) => {
              setMajorId(event.target.value);
              setExportError("");
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Majors</option>
            {data?.filters.majors.map((major) => (
              <option key={major.id} value={major.id}>{major.name}</option>
            ))}
          </select>
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="min-w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Courses</option>
            {filteredCourses.map((course) => (
              <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
            ))}
          </select>
          <button
            onClick={exportMajorReport}
            className="ml-auto rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Export Major Report
          </button>
        </div>
        {exportError && <p className="mt-2 text-xs text-red-600">{exportError}</p>}
      </div>
    );
  }

  function renderTabs() {
    return (
      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-t-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === item ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item === "Trends" ? "View Trends" : item}
          </button>
        ))}
      </div>
    );
  }

  function renderOverview() {
    const courses = data?.courseStats || [];
    const overview = data?.overview;
    if (!overview || courses.length === 0) return <EmptyState />;

    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Courses Analyzed" value={overview.courseCount} />
          <MetricCard label="Approved Blueprints" value={overview.blueprintCount} />
          <MetricCard label="Exam Questions" value={overview.totalQuestions} />
          <MetricCard label="High Order Thinking" value={`${overview.highOrderThinkingPercent}%`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Readiness Signals</h2>
            <div className="space-y-4">
              <ReadinessRow label="Average CLO coverage" value={overview.avgCLOCoverage} />
              <ReadinessRow label="Average topic coverage" value={overview.avgTopicCoverage} />
              <ReadinessRow label="Low Order Thinking" value={overview.lowOrderThinkingPercent} neutral />
              <ReadinessRow label="High Order Thinking" value={overview.highOrderThinkingPercent} neutral />
              <ReadinessRow label="Open-ended questions" value={overview.openEndedQuestionPercent} neutral />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Coverage Alerts</h2>
              {riskyCourses.length > 0 && (
                <button onClick={() => setTab("Readiness Gaps")} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                  View all {riskyCourses.length} &rarr;
                </button>
              )}
            </div>
            {riskyCourses.length === 0 ? (
              <p className="text-sm text-green-700">All analyzed courses have complete CLO and topic coverage.</p>
            ) : (
              <div className="space-y-2">
                {riskyCourses.slice(0, 6).map((course) => (
                  <div key={course.courseOfferingId || course.courseId} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="font-semibold">{course.courseCode}</span> has {course.cloCoverage.total - course.cloCoverage.covered} CLO gap(s) and {course.topicCoverage.total - course.topicCoverage.covered} topic gap(s).
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <CourseReadinessTable courses={courses} />
      </div>
    );
  }

  function renderReadinessGaps() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    const cloGapCourses = courses.filter((course) => course.cloCoverage.percent < 100);
    const topicGapCourses = courses.filter((course) => course.topicCoverage.percent < 100);

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Every active-term course with an incomplete CLO or topic mapping. Fix gaps here before the term closes.</p>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Courses With Gaps" value={riskyCourses.length} />
          <MetricCard label="Courses Missing CLOs" value={cloGapCourses.length} />
          <MetricCard label="Courses Missing Topics" value={topicGapCourses.length} />
        </div>
        {riskyCourses.length === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
            All analyzed courses have complete CLO and topic coverage.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Course</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Major</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">CLO Gaps</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Topic Gaps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riskyCourses.map((course) => (
                  <tr key={course.courseOfferingId || course.courseId}>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-indigo-600">{course.courseCode}</span>{" "}
                      <span className="text-gray-700">{course.courseName}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{course.majorName}</td>
                    <td className="px-4 py-2 text-center text-amber-700">{course.cloCoverage.total - course.cloCoverage.covered}</td>
                    <td className="px-4 py-2 text-center text-amber-700">{course.topicCoverage.total - course.topicCoverage.covered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderCLOCoverage() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    return (
      <CoverageTable
        courses={courses}
        type="clo"
        expandedCourse={expandedCourse}
        setExpandedCourse={setExpandedCourse}
      />
    );
  }

  function renderTopicCoverage() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    return (
      <CoverageTable
        courses={courses}
        type="topic"
        expandedCourse={expandedCourse}
        setExpandedCourse={setExpandedCourse}
      />
    );
  }

  function renderBloomBalance() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    const chartData = courses.map((course) => ({
      course: course.courseCode,
      "Low Order Thinking": course.lowOrderThinkingPercent,
      "High Order Thinking": course.highOrderThinkingPercent,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Cognitive Balance by Course</h2>
          <ResponsiveContainer width="100%" height={Math.max(260, courses.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="course" width={70} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Low Order Thinking" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              <Bar dataKey="High Order Thinking" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
                {BLOOM_LEVELS.map((level) => (
                  <th key={level.key} className="px-3 py-3 text-center font-medium text-gray-500">{level.label}</th>
                ))}
                <th className="px-3 py-3 text-center font-medium text-gray-500">Low Order Thinking</th>
                <th className="px-3 py-3 text-center font-medium text-gray-500">High Order Thinking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course) => (
                <tr key={course.courseOfferingId || course.courseId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{course.courseCode}</td>
                  {BLOOM_LEVELS.map((level) => (
                    <td key={level.key} className="px-3 py-3 text-center">{course.bloom[level.key] || 0}</td>
                  ))}
                  <td className="px-3 py-3 text-center text-amber-700 font-medium">{course.lowOrderThinkingPercent}%</td>
                  <td className="px-3 py-3 text-center text-indigo-700 font-medium">{course.highOrderThinkingPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderQuestionFormats() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    const chartData = courses.map((course) => ({
      course: course.courseCode,
      "Closed-ended": course.questionFormats.closedEndedQuestionPercent,
      "Open-ended": course.questionFormats.openEndedQuestionPercent,
    }));
    const flaggedCourses = courses.filter((course) =>
      course.questionFormats.closedEndedQuestionPercent >= 80 ||
      course.questionFormats.openEndedQuestionPercent < 20 ||
      course.questionFormats.closedEndedGradeWeightPercent >= 75
    );

    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Open-ended Questions" value={`${data?.overview.openEndedQuestionPercent ?? 0}%`} />
          <MetricCard label="Closed-ended Questions" value={`${data?.overview.closedEndedQuestionPercent ?? 0}%`} />
          <MetricCard label="Courses Flagged" value={flaggedCourses.length} />
        </div>
        {flaggedCourses.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">Question Format Balance Alerts</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {flaggedCourses.slice(0, 8).map((course) => (
                <div key={course.courseOfferingId || course.courseId} className="rounded-lg bg-white/75 px-3 py-2 text-sm text-amber-900">
                  <span className="font-semibold">{course.courseCode}</span>: {course.questionFormats.closedEndedQuestionPercent}% closed-ended questions, {course.questionFormats.closedEndedGradeWeightPercent}% closed-ended grade weight.
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Question Format Mix by Course</h2>
          <ResponsiveContainer width="100%" height={Math.max(260, courses.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="course" width={70} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Closed-ended" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Open-ended" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Closed-ended Qs</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Open-ended Qs</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Closed-ended Weight</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Open-ended Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course) => (
                <tr key={course.courseOfferingId || course.courseId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{course.courseCode}</p>
                    <p className="text-xs text-gray-400">{course.courseName}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{course.questionFormats.closedEndedQuestions} ({course.questionFormats.closedEndedQuestionPercent}%)</td>
                  <td className="px-4 py-3 text-center">{course.questionFormats.openEndedQuestions} ({course.questionFormats.openEndedQuestionPercent}%)</td>
                  <td className="px-4 py-3 text-center">{course.questionFormats.closedEndedGradeWeightPercent}%</td>
                  <td className="px-4 py-3 text-center">{course.questionFormats.openEndedGradeWeightPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderTrends() {
    const trends = trendsData?.trends || [];
    if (trendsLoading) return <div className="py-12 text-center text-sm text-gray-500">Loading trends...</div>;
    if (trends.length === 0) return <EmptyState msg="No historical approved blueprints are available for the selected scope." />;

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Coverage Trends</h2>
            <p className="text-xs text-gray-500">
              {courseId ? "Course-level drilldown across terms." : "Major-level trend across terms. Select a course for drilldown."}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cloCoveragePercent" name="CLO Coverage" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="topicCoveragePercent" name="Topic Coverage" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="highOrderThinkingPercent" name="High Order Thinking" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Term</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Blueprints</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Questions</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">CLO Coverage</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Topic Coverage</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">High Order Thinking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trends.map((point) => (
                <tr key={point.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{point.label}</td>
                  <td className="px-4 py-3 text-center">{point.blueprintCount}</td>
                  <td className="px-4 py-3 text-center">{point.totalQuestions}</td>
                  <td className="px-4 py-3 text-center">{point.cloCoveragePercent}%</td>
                  <td className="px-4 py-3 text-center">{point.topicCoveragePercent}%</td>
                  <td className="px-4 py-3 text-center">{point.highOrderThinkingPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderProgramSummary() {
    const majors = data?.programSummary || [];
    if (majors.length === 0) return <EmptyState msg="No approved blueprints to summarize." />;
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Major</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Courses</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Blueprints</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Questions</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Avg CLO Coverage</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Avg Topic Coverage</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Avg High Order Thinking</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {majors.map((major) => (
              <tr key={major.majorId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{major.majorName}</td>
                <td className="px-4 py-3 text-center">{major.courseCount}</td>
                <td className="px-4 py-3 text-center">{major.blueprintCount}</td>
                <td className="px-4 py-3 text-center">{major.totalQuestions}</td>
                <td className="px-4 py-3 text-center"><CoverageBar percent={major.avgCLOCoverage} /></td>
                <td className="px-4 py-3 text-center"><CoverageBar percent={major.avgTopicCoverage} /></td>
                <td className="px-4 py-3 text-center text-indigo-700 font-medium">{major.avgHighOrderThinking}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCourseReports() {
    const reports = data?.courseReportStats || [];
    const overview = data?.courseReportOverview;
    const majors = data?.courseReportProgramSummary || [];
    if (!overview || reports.length === 0) {
      return <EmptyState msg="No active-term course offerings are available for course report analytics." />;
    }

    const attentionRows = reports.filter((report) => report.status !== "APPROVED");

    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-5">
          <MetricCard label="Course Offerings" value={overview.offeringCount} />
          <MetricCard label="Approved Reports" value={overview.approvedReports} />
          <MetricCard label="Missing Approved" value={overview.missingApprovedReports} />
          <MetricCard label="Pending Review" value={overview.pendingReports} />
          <MetricCard label="Avg Completion" value={`${overview.avgResponseCompletion}%`} />
        </div>

        {attentionRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">Course Report Follow-up</h2>
            <p className="mt-1 text-xs text-amber-800">
              Official reporting should use approved course reports only. These offerings still need submission, revision, or coordinator approval.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {attentionRows.slice(0, 8).map((report) => (
                <div key={report.courseOfferingId} className="rounded-lg bg-white/75 px-3 py-2 text-sm text-amber-900">
                  <span className="font-semibold">{report.courseCode}</span> is {statusLabel(report.status).toLowerCase()} with {report.answeredResponses}/{report.totalResponses} responses completed.
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Instructor</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Roster</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Responses</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Submitted</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.courseOfferingId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{report.courseCode}</p>
                    <p className="text-xs text-gray-500">{report.courseName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{report.instructorNames.join(", ") || "Unassigned"}</td>
                  <td className="px-4 py-3 text-center">{report.rosterSize}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(report.status)}`}>
                      {statusLabel(report.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CoverageBar percent={report.responseCompletionPercent} neutral={report.status === "APPROVED"} />
                    <p className="mt-1 text-xs text-gray-400">{report.answeredResponses}/{report.totalResponses}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{report.reviewedAt ? new Date(report.reviewedAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Major</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Courses</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Approved</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Pending</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Needs Revision</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Missing Approved</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Avg Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {majors.map((major) => (
                <tr key={major.majorId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{major.majorName}</td>
                  <td className="px-4 py-3 text-center">{major.courses}</td>
                  <td className="px-4 py-3 text-center text-green-700 font-medium">{major.approvedReports}</td>
                  <td className="px-4 py-3 text-center">{major.pendingReports}</td>
                  <td className="px-4 py-3 text-center">{major.needsRevisionReports}</td>
                  <td className="px-4 py-3 text-center text-amber-700 font-medium">{major.missingApprovedReports}</td>
                  <td className="px-4 py-3 text-center"><CoverageBar percent={major.avgResponseCompletion} neutral /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderGradeAnalytics() {
    if (gradesLoading) return <div className="py-12 text-center text-sm text-gray-500">Loading grade analytics...</div>;
    if (!gradeData || gradeData.courseStats.length === 0) return <EmptyState msg="No approved grade data is available for the selected scope." />;
    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Average" value={`${gradeData.overview.average}%`} />
          <MetricCard label="Median" value={`${gradeData.overview.median}%`} />
          <MetricCard label="Standard Deviation" value={`${gradeData.overview.standardDeviation}%`} />
          <MetricCard label="Fail Count" value={gradeData.overview.failCount} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Official Grade Distribution</h2>
            <p className="text-xs text-gray-500">Approved grade assessments only.</p>
          </div>
          <GradeDistributionChart percents={gradeData.percents} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Roster</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Approved Assessments</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Completion</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Average</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Fail Rate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Insight Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradeData.courseStats.map((course) => (
                <tr key={course.courseOfferingId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{course.courseCode}</p>
                    <p className="text-xs text-gray-500">{course.courseName}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{course.rosterSize}</td>
                  <td className="px-4 py-3 text-center">{course.approvedAssessments}</td>
                  <td className="px-4 py-3 text-center"><CoverageBar percent={course.completionPercent} /></td>
                  <td className="px-4 py-3 text-center font-medium">{course.stats.average}%</td>
                  <td className="px-4 py-3 text-center font-medium">{course.failRate}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {course.insights.slice(0, 3).map((insight) => (
                        <span key={insight.metricKey} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${insight.severity === "critical" ? "bg-red-100 text-red-700" : insight.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {insight.title}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Major</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Courses</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Students</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Approved Assessments</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Average</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Fail Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradeData.majorSummary.map((major) => (
                <tr key={major.majorId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{major.majorName}</td>
                  <td className="px-4 py-3 text-center">{major.courses}</td>
                  <td className="px-4 py-3 text-center">{major.students}</td>
                  <td className="px-4 py-3 text-center">{major.approvedAssessments}</td>
                  <td className="px-4 py-3 text-center">{major.average}%</td>
                  <td className="px-4 py-3 text-center">{major.failRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Active-term blueprint analytics across approved exams, with historical trends separated from current-term review.
        </p>
      </div>

      {renderFilters()}
      {renderTabs()}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {tab === "Current Term Overview" && renderOverview()}
          {tab === "CLO Coverage" && renderCLOCoverage()}
          {tab === "Topic Coverage" && renderTopicCoverage()}
          {tab === "Bloom Balance" && renderBloomBalance()}
          {tab === "Question Formats" && renderQuestionFormats()}
          {tab === "Readiness Gaps" && renderReadinessGaps()}
          {tab === "Trends" && renderTrends()}
          {tab === "Program Summary" && renderProgramSummary()}
          {tab === "Course Reports" && renderCourseReports()}
          {tab === "Grade Analytics" && renderGradeAnalytics()}
        </>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    NOT_STARTED: "Not Started",
    DRAFT: "Draft",
    SUBMITTED: "Pending Review",
    APPROVED: "Approved",
    NEEDS_REVISION: "Needs Revision",
  };
  return labels[status] || status.replace("_", " ");
}

function statusStyle(status: string) {
  const styles: Record<string, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-700",
    DRAFT: "bg-slate-100 text-slate-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    NEEDS_REVISION: "bg-amber-100 text-amber-700",
  };
  return styles[status] || styles.DRAFT;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ReadinessRow({ label, value, neutral = false }: { label: string; value: number; neutral?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={neutral ? "font-medium text-gray-900" : value >= 90 ? "font-medium text-green-700" : "font-medium text-amber-700"}>{value}%</span>
      </div>
      <CoverageBar percent={value} neutral={neutral} />
    </div>
  );
}

function CoverageBar({ percent, neutral = false }: { percent: number; neutral?: boolean }) {
  const color = neutral ? "bg-indigo-500" : percent === 100 ? "bg-green-500" : percent >= 80 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-gray-600">{percent}%</span>
    </div>
  );
}

function CourseReadinessTable({ courses }: { courses: CourseStat[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Blueprints</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Questions</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">CLO Coverage</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Topic Coverage</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">High Order Thinking</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {courses.map((course) => (
            <tr key={course.courseOfferingId || course.courseId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{course.courseCode}</p>
                <p className="text-xs text-gray-500">{course.courseName}</p>
              </td>
              <td className="px-4 py-3 text-center">{course.blueprintCount}</td>
              <td className="px-4 py-3 text-center">{course.totalQuestions}</td>
              <td className="px-4 py-3 text-center"><CoverageBar percent={course.cloCoverage.percent} /></td>
              <td className="px-4 py-3 text-center"><CoverageBar percent={course.topicCoverage.percent} /></td>
              <td className="px-4 py-3 text-center text-indigo-700 font-medium">{course.highOrderThinkingPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoverageTable({
  courses,
  type,
  expandedCourse,
  setExpandedCourse,
}: {
  courses: CourseStat[];
  type: "clo" | "topic";
  expandedCourse: string | null;
  setExpandedCourse: (value: string | null) => void;
}) {
  const isClo = type === "clo";
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Course</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Blueprints</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Total {isClo ? "CLOs" : "Topics"}</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">{isClo ? "Covered CLOs" : "Covered Topics"}</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Gaps</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Coverage</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {courses.map((course) => {
            const coverage = isClo ? course.cloCoverage : course.topicCoverage;
            const details = isClo ? course.loDetails : course.topicDetails;
            const rowKey = `${type}-${course.courseOfferingId || course.courseId}`;
            const expanded = expandedCourse === rowKey;
            const gaps = coverage.total - coverage.covered;
            return (
              <Fragment key={rowKey}>
                <tr className={gaps > 0 ? "bg-amber-50/50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{course.courseCode}</p>
                    <p className="text-xs text-gray-500">{course.courseName}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{course.blueprintCount}</td>
                  <td className="px-4 py-3 text-center">{coverage.total}</td>
                  <td className="px-4 py-3 text-center font-medium text-green-700">{coverage.covered}</td>
                  <td className="px-4 py-3 text-center">{gaps > 0 ? <span className="font-semibold text-amber-700">{gaps}</span> : <span className="text-green-700">0</span>}</td>
                  <td className="px-4 py-3 text-center"><CoverageBar percent={coverage.percent} /></td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setExpandedCourse(expanded ? null : rowKey)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {expanded ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={7} className="bg-gray-50 px-6 py-4">
                      <div className="grid gap-2 md:grid-cols-2">
                        {details.map((item) => (
                          <div
                            key={item.id}
                            className={`rounded-lg px-3 py-2 text-xs ${item.covered ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">{"code" in item ? item.code : item.name}</span>
                              <span>{item.covered ? `${item.questionCount} q` : "Gap"}</span>
                            </div>
                            {"description" in item && <p className="mt-1 text-gray-600">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ msg }: { msg?: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">{msg || "No approved blueprint data is available for the selected scope."}</div>;
}
