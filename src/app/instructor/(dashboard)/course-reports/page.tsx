"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ReportRow {
  id: string;
  editable: boolean;
  term: { semester: string; academicYear: string };
  course: { id: string; code: string; name: string; major: { name: string } };
  report: { id: string; status: string; submittedAt: string | null; reviewedAt: string | null; updatedAt: string } | null;
  counts: { enrollments: number; blueprints: number; gradeAssessments: number };
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Pending approval",
  APPROVED: "Approved",
  NEEDS_REVISION: "Needs revision",
  NOT_STARTED: "Not started",
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  NEEDS_REVISION: "bg-amber-100 text-amber-700",
  NOT_STARTED: "bg-gray-100 text-gray-500",
};

export default function InstructorCourseReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/instructor/course-reports")
      .then(async (res) => {
        const data = await res.json().catch(() => ([]));
        if (!res.ok) throw new Error(data.error || "Could not load course reports.");
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeRows = rows.filter((row) => row.editable).sort((a, b) => statusPriority(a) - statusPriority(b));
  const archiveRows = rows.filter((row) => !row.editable);
  const counts = useMemo(() => {
    const result = { revision: 0, pending: 0, draft: 0, approved: 0, notStarted: 0 };
    activeRows.forEach((row) => {
      const status = row.report?.status || "NOT_STARTED";
      if (status === "NEEDS_REVISION") result.revision++;
      else if (status === "SUBMITTED") result.pending++;
      else if (status === "APPROVED") result.approved++;
      else if (status === "DRAFT") result.draft++;
      else result.notStarted++;
    });
    return result;
  }, [activeRows]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Course Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Submit the semester-end course file summary and evidence for coordinator approval.</p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No course offerings are assigned yet. Ask the coordinator to assign active-term courses.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Needs revision" value={counts.revision} tone="amber" />
            <Metric label="Pending approval" value={counts.pending} tone="blue" />
            <Metric label="Draft" value={counts.draft} tone="gray" />
            <Metric label="Approved" value={counts.approved} tone="green" />
            <Metric label="Not started" value={counts.notStarted} tone="gray" />
          </div>
          <ReportTable title="Active Term" rows={activeRows} empty="No active-term course reports yet." />
          {archiveRows.length > 0 && <ReportTable title="Archive / Read Only" rows={archiveRows} empty="No archived course reports." />}
        </div>
      )}
    </div>
  );
}

function ReportTable({ title, rows, empty }: { title: string; rows: ReportRow[]; empty: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400">{rows.length} course{rows.length === 1 ? "" : "s"}</span>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{empty}</div>
      ) : (
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">Course</th>
              <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">Term</th>
              <th className="px-5 py-3 text-center text-sm font-medium text-gray-500">Students</th>
              <th className="px-5 py-3 text-center text-sm font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 text-right text-sm font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => {
              const status = row.report?.status || "NOT_STARTED";
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs text-indigo-600">{row.course.code}</p>
                    <p className="font-medium text-gray-900">{row.course.name}</p>
                    <p className="text-xs text-gray-400">{row.course.major.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {row.term.semester} {row.term.academicYear}
                    {!row.editable && <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Read only</span>}
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-700">{row.counts.enrollments}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/instructor/course-reports/${row.course.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                      {row.editable ? "Open Report" : "View Report"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "green" | "gray" }) {
  const tones = {
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    gray: "bg-white border-gray-200 text-gray-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function statusPriority(row: ReportRow) {
  const status = row.report?.status || "NOT_STARTED";
  const priorities: Record<string, number> = { NEEDS_REVISION: 0, DRAFT: 1, NOT_STARTED: 2, SUBMITTED: 3, APPROVED: 4 };
  return priorities[status] ?? 5;
}
