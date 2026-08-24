"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CourseReportRow {
  id: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
  instructor: { name: string; email: string };
  courseOffering: {
    term: { semester: string; academicYear: string };
    course: { code: string; name: string; major: { name: string } };
    _count: { enrollments: number; blueprints: number; gradeAssessments: number };
  };
  _count: { comments: number };
}

const labels: Record<string, string> = {
  SUBMITTED: "Pending approval",
  APPROVED: "Approved",
  NEEDS_REVISION: "Needs revision",
  DRAFT: "Draft",
};

const styles: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  NEEDS_REVISION: "bg-amber-100 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-700",
};

export default function CoordinatorCourseReportsPage() {
  const [reports, setReports] = useState<CourseReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/coordinator/course-reports")
      .then(async (res) => {
        const data = await res.json().catch(() => ([]));
        if (!res.ok) throw new Error(data.error || "Could not load course reports.");
        setReports(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    pending: reports.filter((report) => report.status === "SUBMITTED").length,
    revision: reports.filter((report) => report.status === "NEEDS_REVISION").length,
    approved: reports.filter((report) => report.status === "APPROVED").length,
  }), [reports]);
  const filtered = reports.filter((report) => {
    if (statusFilter && report.status !== statusFilter) return false;
    const normalized = search.trim().toLowerCase();
    if (!normalized) return true;
    const haystack = `${report.courseOffering.course.code} ${report.courseOffering.course.name} ${report.courseOffering.course.major.name} ${report.instructor.name}`.toLowerCase();
    return haystack.includes(normalized);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Course Report Review</h1>
        <p className="mt-1 text-sm text-gray-500">Review semester-end course reports submitted by instructors.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Pending Review" value={counts.pending} tone="blue" />
        <Metric label="Needs Revision" value={counts.revision} tone="amber" />
        <Metric label="Approved" value={counts.approved} tone="green" />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          {["SUBMITTED", "NEEDS_REVISION", "APPROVED", ""].map((status) => (
            <button
              key={status || "all"}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${statusFilter === status ? "bg-teal-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {status ? labels[status] : "All"}
            </button>
          ))}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search course, major, or instructor..."
            className="min-w-72 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">No course reports found for these filters.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">Course</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">Instructor</th>
                <th className="px-5 py-3 text-center text-sm font-medium text-gray-500">Term</th>
                <th className="px-5 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-center text-sm font-medium text-gray-500">Students</th>
                <th className="px-5 py-3 text-right text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs text-teal-600">{report.courseOffering.course.code}</p>
                    <p className="font-medium text-gray-900">{report.courseOffering.course.name}</p>
                    <p className="text-xs text-gray-400">{report.courseOffering.course.major.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{report.instructor.name}</td>
                  <td className="px-5 py-4 text-center text-sm text-gray-600">{report.courseOffering.term.semester} {report.courseOffering.term.academicYear}</td>
                  <td className="px-5 py-4 text-center"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[report.status]}`}>{labels[report.status]}</span></td>
                  <td className="px-5 py-4 text-center text-sm text-gray-700">{report.courseOffering._count.enrollments}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/coordinator/course-reports/${report.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-800">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "green" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-green-50 text-green-700 border-green-100",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
