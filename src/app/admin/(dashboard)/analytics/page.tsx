"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid, Cell,
} from "recharts";
import { BLOOM_LEVELS, SEMESTERS, getAcademicYears } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LODetail { id: string; code: string; description: string; covered: boolean }
interface TopicDetail { id: string; name: string; covered: boolean }

interface CourseStat {
  courseId: string; courseCode: string; courseName: string;
  majorId: string; majorName: string;
  blueprintCount: number; totalMarks: number; totalQuestions: number;
  bloom: Record<string, number>;
  hotPercent: number; lotPercent: number;
  qTypes: Record<string, number>;
  cloCoverage: { covered: number; total: number; percent: number };
  topicCoverage: { covered: number; total: number; percent: number };
  loDetails: LODetail[];
  topicDetails: TopicDetail[];
}

interface MajorStat {
  majorId: string; majorName: string;
  courseCount: number; blueprintCount: number;
  avgHOTPercent: number; avgCLOCoverage: number; avgTopicCoverage: number;
}

interface BloomTrendPoint {
  semester: string; academicYear: string;
  bloom: Record<string, number>; totalQ: number;
  hotPercent: number; lotPercent: number;
}

interface QTypeTrendPoint {
  semester: string; academicYear: string;
  qTypes: Record<string, number>; totalQ: number;
}

interface FilterOption { id: string; name: string; code?: string; majorId?: string }

interface AnalyticsData {
  courseStats: CourseStat[];
  majorStats: MajorStat[];
  bloomTrend: BloomTrendPoint[];
  qTypeTrend: QTypeTrendPoint[];
  filters: { majors: FilterOption[]; courses: FilterOption[] };
}

const TABS = [
  "CLO Coverage", "Topic Coverage", "Bloom Trend",
  "Q-Type Trend", "Assessment Load", "Major Comparison",
] as const;

const QTYPE_COLORS: Record<string, string> = {
  MCQ: "#6366f1", SHORT_ANSWER: "#f59e0b", ESSAY: "#10b981",
  TRUE_FALSE: "#ef4444", PROBLEM_SOLVING: "#8b5cf6",
};
const QTYPE_LABELS: Record<string, string> = {
  MCQ: "MCQ", SHORT_ANSWER: "Short Answer", ESSAY: "Essay",
  TRUE_FALSE: "True/False", PROBLEM_SOLVING: "Problem Solving",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>("CLO Coverage");

  // Filters
  const [majorId, setMajorId] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [courseId, setCourseId] = useState("");

  // Expansion
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const academicYears = getAcademicYears();

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (majorId) params.set("majorId", majorId);
    if (semester) params.set("semester", semester);
    if (academicYear) params.set("academicYear", academicYear);
    if (courseId) params.set("courseId", courseId);
    const res = await fetch(`/api/admin/analytics?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [majorId, semester, academicYear, courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtered courses for dropdown (based on major)
  const filteredCourses = data?.filters.courses.filter(
    (c) => !majorId || c.majorId === majorId
  ) || [];

  // Reset courseId if major changes and course doesn't belong to it
  useEffect(() => {
    if (majorId && courseId) {
      const belongs = filteredCourses.some((c) => c.id === courseId);
      if (!belongs) setCourseId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorId]);

  // ─── Render helpers ─────────────────────────────────────────────────────────

  function renderFilters() {
    return (
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={majorId} onChange={(e) => setMajorId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
          <option value="">All Majors</option>
          {data?.filters.majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={semester} onChange={(e) => setSemester(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
          <option value="">All Semesters</option>
          {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
          <option value="">All Years</option>
          {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
          <option value="">All Courses</option>
          {filteredCourses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
      </div>
    );
  }

  function renderTabs() {
    return (
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200 pb-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition ${
              tab === t ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}>
            {t}
          </button>
        ))}
      </div>
    );
  }

  // ─── TAB 1: CLO Coverage Gaps ─────────────────────────────────────────────

  function renderCLOCoverage() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Total CLOs</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Covered</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Gaps</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Coverage %</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((c) => {
              const gaps = c.cloCoverage.total - c.cloCoverage.covered;
              const hasGaps = gaps > 0;
              const expanded = expandedCourse === c.courseId;
              return (
                <tbody key={c.courseId}>
                  <tr className={hasGaps ? "bg-red-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.courseCode} — {c.courseName}</td>
                    <td className="px-4 py-3 text-center">{c.cloCoverage.total}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium">{c.cloCoverage.covered}</td>
                    <td className="px-4 py-3 text-center">
                      {hasGaps ? <span className="text-red-600 font-semibold">{gaps}</span> : <span className="text-green-600">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CoverageBar percent={c.cloCoverage.percent} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setExpandedCourse(expanded ? null : c.courseId)}
                        className="text-xs text-indigo-600 hover:text-indigo-800">{expanded ? "Hide" : "Details"}</button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={6} className="px-8 py-3 bg-gray-50">
                        <div className="space-y-1">
                          {c.loDetails.map((lo) => (
                            <div key={lo.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${lo.covered ? "text-green-700" : "text-red-600 bg-red-50"}`}>
                              <span>{lo.covered ? "✓" : "✗"}</span>
                              <span className="font-mono font-semibold">{lo.code}</span>
                              <span className="text-gray-600">{lo.description}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── TAB 2: Topic Coverage Gaps ───────────────────────────────────────────

  function renderTopicCoverage() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Total Topics</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Included</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Missing</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Coverage %</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((c) => {
              const missing = c.topicCoverage.total - c.topicCoverage.covered;
              const hasMissing = missing > 0;
              const expanded = expandedCourse === `topic-${c.courseId}`;
              return (
                <tbody key={c.courseId}>
                  <tr className={hasMissing ? "bg-amber-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.courseCode} — {c.courseName}</td>
                    <td className="px-4 py-3 text-center">{c.topicCoverage.total}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium">{c.topicCoverage.covered}</td>
                    <td className="px-4 py-3 text-center">
                      {hasMissing ? <span className="text-amber-600 font-semibold">{missing}</span> : <span className="text-green-600">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CoverageBar percent={c.topicCoverage.percent} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setExpandedCourse(expanded ? null : `topic-${c.courseId}`)}
                        className="text-xs text-indigo-600 hover:text-indigo-800">{expanded ? "Hide" : "Details"}</button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={6} className="px-8 py-3 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                          {c.topicDetails.map((t) => (
                            <div key={t.id} className={`text-xs px-2 py-1 rounded ${t.covered ? "text-green-700" : "text-amber-700 bg-amber-50"}`}>
                              {t.covered ? "✓" : "✗"} {t.name}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── TAB 3: Bloom Trend Over Time ─────────────────────────────────────────

  function renderBloomTrend() {
    const trend = data?.bloomTrend || [];
    if (!courseId) return <PromptCourseSelection />;
    if (trend.length === 0) return <EmptyState msg="No trend data for this course (needs approved blueprints with semester info)." />;

    const chartData = trend.map((t) => {
      const total = Object.values(t.bloom).reduce((s, v) => s + v, 0);
      const row: Record<string, string | number> = { label: `${t.semester} ${t.academicYear}` };
      BLOOM_LEVELS.forEach((b) => {
        row[b.label] = total > 0 ? Math.round(((t.bloom[b.key] || 0) / total) * 100) : 0;
      });
      row["HOT%"] = t.hotPercent;
      row["LOT%"] = t.lotPercent;
      return row;
    });

    return (
      <div className="space-y-6">
        {/* Bloom distribution lines */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Bloom&apos;s Level % Over Semesters</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip />
              <Legend />
              {BLOOM_LEVELS.map((b) => (
                <Line key={b.key} type="monotone" dataKey={b.label} stroke={b.color} strokeWidth={2} dot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* HOT vs LOT */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">HOT vs LOT % Over Semesters</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip />
              <Legend />
              <Bar dataKey="LOT%" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="HOT%" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ─── TAB 4: Q-Type Trend ──────────────────────────────────────────────────

  function renderQTypeTrend() {
    const trend = data?.qTypeTrend || [];
    if (!courseId) return <PromptCourseSelection />;
    if (trend.length === 0) return <EmptyState msg="No trend data for this course." />;

    const allTypes = Array.from(new Set(trend.flatMap((t) => Object.keys(t.qTypes))));
    const chartData = trend.map((t) => {
      const row: Record<string, string | number> = { label: `${t.semester} ${t.academicYear}` };
      allTypes.forEach((qt) => { row[QTYPE_LABELS[qt] || qt] = t.qTypes[qt] || 0; });
      return row;
    });

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Question Type Distribution Over Semesters</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            {allTypes.map((qt) => (
              <Bar key={qt} dataKey={QTYPE_LABELS[qt] || qt} stackId="a"
                fill={QTYPE_COLORS[qt] || "#94a3b8"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ─── TAB 5: Assessment Load ───────────────────────────────────────────────

  function renderAssessmentLoad() {
    const courses = data?.courseStats || [];
    if (courses.length === 0) return <EmptyState />;

    const chartData = courses.map((c) => ({
      name: c.courseCode,
      Marks: c.totalMarks,
      Questions: c.totalQuestions,
    }));

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Assessment Load per Course</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, courses.length * 50)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Marks" fill="#6366f1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Questions" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Blueprints</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Total Marks</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Total Questions</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Qs/Mark Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((c) => (
                <tr key={c.courseId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.courseCode} — {c.courseName}</td>
                  <td className="px-4 py-3 text-center">{c.blueprintCount}</td>
                  <td className="px-4 py-3 text-center">{c.totalMarks}</td>
                  <td className="px-4 py-3 text-center">{c.totalQuestions}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {c.totalMarks > 0 ? (c.totalQuestions / c.totalMarks).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── TAB 6: Major Comparison ──────────────────────────────────────────────

  function renderMajorComparison() {
    const majors = data?.majorStats || [];
    if (majors.length === 0) return <EmptyState msg="No approved blueprints to compare." />;

    const chartData = majors.map((m) => ({
      name: m.majorName.length > 20 ? m.majorName.slice(0, 18) + "…" : m.majorName,
      "Avg HOT%": m.avgHOTPercent,
      "CLO Coverage%": m.avgCLOCoverage,
      "Topic Coverage%": m.avgTopicCoverage,
    }));

    const barColors = ["#6366f1", "#22c55e", "#f59e0b"];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Major Comparison — Averages Across Courses</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, majors.length * 60)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip />
              <Legend />
              {["Avg HOT%", "CLO Coverage%", "Topic Coverage%"].map((key, i) => (
                <Bar key={key} dataKey={key} fill={barColors[i]} radius={[0, 4, 4, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Major</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Courses</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Blueprints</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Avg HOT%</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Avg CLO Coverage</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Avg Topic Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {majors.map((m) => (
                <tr key={m.majorId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.majorName}</td>
                  <td className="px-4 py-3 text-center">{m.courseCount}</td>
                  <td className="px-4 py-3 text-center">{m.blueprintCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={m.avgHOTPercent >= 40 ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>{m.avgHOTPercent}%</span>
                  </td>
                  <td className="px-4 py-3 text-center"><CoverageBar percent={m.avgCLOCoverage} /></td>
                  <td className="px-4 py-3 text-center"><CoverageBar percent={m.avgTopicCoverage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
      <p className="text-sm text-gray-500 mb-6">Aggregate analysis across approved blueprints. Select filters to narrow the scope.</p>

      {renderFilters()}
      {renderTabs()}

      {loading ? (
        <div className="text-gray-500 py-12 text-center">Loading analytics...</div>
      ) : (
        <>
          {tab === "CLO Coverage" && renderCLOCoverage()}
          {tab === "Topic Coverage" && renderTopicCoverage()}
          {tab === "Bloom Trend" && renderBloomTrend()}
          {tab === "Q-Type Trend" && renderQTypeTrend()}
          {tab === "Assessment Load" && renderAssessmentLoad()}
          {tab === "Major Comparison" && renderMajorComparison()}
        </>
      )}
    </div>
  );
}

// ─── Shared small components ────────────────────────────────────────────────

function CoverageBar({ percent }: { percent: number }) {
  const color = percent === 100 ? "bg-green-500" : percent >= 80 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-10 text-right">{percent}%</span>
    </div>
  );
}

function EmptyState({ msg }: { msg?: string }) {
  return <div className="text-center py-12 text-gray-400 text-sm">{msg || "No data available for the selected filters."}</div>;
}

function PromptCourseSelection() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm mb-2">Select a specific course from the filters above to view trend data.</p>
      <p className="text-xs text-gray-400">Trends are only meaningful for a single course over multiple semesters.</p>
    </div>
  );
}
