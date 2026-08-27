"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GradeDistributionChart from "@/components/GradeDistributionChart";
import { getGradeInsights, getGradeStats, getLetterGrade, getStudentWeightedPercent } from "@/lib/grades";
import { statusLabel } from "@/lib/constants";

interface GradebookAssessment {
  id: string;
  name: string;
  weightPercent: number;
  maxPoints: number;
  status: string;
  entries: { studentId: string; rawPoints: number | null }[];
}

interface GradebookReview {
  id: string;
  status: string;
  instructor: { name: string; email: string };
  course: {
    code: string;
    name: string;
    major: { name: string };
    enrollments: {
      id: string;
      group: string | null;
      student: {
        id: string;
        firstName: string;
        lastName: string;
        displayName: string | null;
        email: string | null;
        universityStudentId: string | null;
      };
    }[];
  };
  assessments: GradebookAssessment[];
  comments: { id: string; content: string; createdAt: string; coordinator: { name: string } }[];
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    NEEDS_REVISION: "bg-amber-100 text-amber-700",
    DRAFT: "bg-gray-100 text-gray-700",
  };
  return styles[status] || "bg-gray-100 text-gray-700";
}

export default function CoordinatorGradeReviewDetailPage({ params }: { params: Promise<{ offeringId: string }> }) {
  const { offeringId } = use(params);
  const [gradebook, setGradebook] = useState<GradebookReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/coordinator/grades/${offeringId}`);
    if (res.ok) setGradebook(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId]);

  const rows = useMemo(() => {
    if (!gradebook) return [];
    return gradebook.course.enrollments.map((enrollment) => {
      const percent = getStudentWeightedPercent(enrollment.student.id, gradebook.assessments);
      return { enrollment, percent, grade: getLetterGrade(percent) };
    });
  }, [gradebook]);

  const percents = rows.map((row) => row.percent);
  const stats = getGradeStats(percents);
  const insights = gradebook ? getGradeInsights(percents, gradebook.assessments, rows.length) : [];

  async function review(status: "APPROVED" | "NEEDS_REVISION") {
    setSubmitting(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/coordinator/grades/${offeringId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    });
    const data = await res.json();
    if (res.ok) {
      setComment("");
      setMessage(status === "APPROVED" ? "Gradebook approved." : "Revision requested. The instructor has been notified.");
      await load();
    } else {
      setError(data.error || "Review failed");
    }
    setSubmitting(false);
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!gradebook) return <div className="text-red-500">Gradebook not found</div>;

  return (
    <div>
      <Link href="/coordinator/grades" className="text-teal-600 hover:text-teal-800 text-sm mb-4 inline-block">
        &larr; Back to Grade Approvals
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{gradebook.course.code} Gradebook</h1>
            <p className="text-gray-500 mt-1">{gradebook.course.name} • {gradebook.course.major.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Instructor: {gradebook.instructor.name} • {gradebook.assessments.length} assessments • {rows.length} students
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusBadge(gradebook.status)}`}>
            {statusLabel(gradebook.status)}
          </span>
        </div>

        {message && <div className="mt-4 bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-2 text-sm">{message}</div>}

        {gradebook.status === "SUBMITTED" && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
              rows={3}
              placeholder="Comment required for revision, optional for approval..."
            />
            <div className="flex gap-2">
              <button onClick={() => review("APPROVED")} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                Approve Gradebook
              </button>
              <button onClick={() => review("NEEDS_REVISION")} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
                Request Revision
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Grade Distribution</h2>
          <span className="text-xs text-gray-400">Whole gradebook, weighted by assessment</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-5">
          <Stat label="Average" value={`${stats.average}%`} />
          <Stat label="Median" value={`${stats.median}%`} />
          <Stat label="Highest" value={`${stats.highest}%`} />
          <Stat label="Lowest" value={`${stats.lowest}%`} />
          <Stat label="Std Dev" value={`${stats.standardDeviation}%`} />
          <Stat label="Pass" value={stats.passCount} />
          <Stat label="Fail" value={stats.failCount} />
        </div>
        <div className="grid gap-2 mb-5">
          {insights.map((insight) => (
            <div key={insight.metricKey} className={`rounded-lg px-4 py-3 text-sm border ${insight.severity === "critical" ? "bg-red-50 border-red-200 text-red-800" : insight.severity === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              <p className="font-semibold">{insight.title}</p>
              <p>{insight.detail}</p>
            </div>
          ))}
        </div>
        <GradeDistributionChart percents={percents} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Student Grades</h2>
          <p className="text-xs text-gray-500 mt-1">Each row shows all assessment scores and the weighted gradebook result.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 sticky left-0 bg-gray-50">Student</th>
                {gradebook.assessments.map((assessment) => (
                  <th key={assessment.id} className="text-center px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    {assessment.name}
                    <span className="block text-[11px] font-normal text-gray-400">{assessment.weightPercent}%</span>
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-medium text-gray-500">Weighted %</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Letter</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Quality Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.enrollment.id}>
                  <td className="px-4 py-3 sticky left-0 bg-white">
                    <p className="font-medium text-gray-900">
                      {row.enrollment.student.displayName || `${row.enrollment.student.lastName}, ${row.enrollment.student.firstName}`}
                    </p>
                    <p className="text-xs text-gray-400">{row.enrollment.student.universityStudentId || row.enrollment.student.email || "No ID"}</p>
                  </td>
                  {gradebook.assessments.map((assessment) => {
                    const entry = assessment.entries.find((item) => item.studentId === row.enrollment.student.id);
                    return (
                      <td key={assessment.id} className="px-4 py-3 text-center whitespace-nowrap">
                        {entry?.rawPoints ?? "—"} / {assessment.maxPoints}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-semibold">{row.percent}%</td>
                  <td className="px-4 py-3 text-center font-semibold">{row.grade.letter}</td>
                  <td className="px-4 py-3 text-center">{row.grade.qualityPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Review Comments</h2>
        {gradebook.comments.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet.</p>
        ) : (
          <div className="space-y-2">
            {gradebook.comments.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{item.coordinator.name}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
