"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { COURSE_PROGRESS_REPORT_PROMPTS, STATUS_COLORS, statusLabel } from "@/lib/constants";

type ResponseMap = Record<string, string>;

interface Report {
  id: string;
  status: string;
  responses?: ResponseMap | null;
  submittedAt: string | null;
  instructor: { name: string; email: string };
  courseOffering: {
    term: { semester: string; academicYear: string };
    course: { code: string; name: string; major: { name: string } };
    _count: { enrollments: number; blueprints: number; gradeAssessments: number };
  };
  comments: { id: string; content: string; createdAt: string; coordinator: { name: string } }[];
}

const styles = STATUS_COLORS;

export default function CoordinatorCourseReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/coordinator/course-reports/${params.reportId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load course report.");
        setReport(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.reportId]);

  const completion = useMemo(() => {
    const responses = report?.responses || {};
    const answered = COURSE_PROGRESS_REPORT_PROMPTS.filter((item) => (responses[item.key] || "").trim().length > 0).length;
    return { answered, total: COURSE_PROGRESS_REPORT_PROMPTS.length };
  }, [report?.responses]);

  async function review(action: "APPROVE" | "REQUEST_REVISION") {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/coordinator/course-reports/${params.reportId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not review course report.");
      return;
    }
    router.push("/coordinator/course-reports");
  }

  if (loading) return <div className="text-gray-500">Loading course progress report...</div>;
  if (error && !report) return <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>;
  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/coordinator/course-reports" className="text-sm text-teal-600 hover:text-teal-800">Back to Course Report Review</Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Review Course Progress Report</h1>
          <p className="mt-1 text-sm text-gray-500">
            {report.courseOffering.course.code} — {report.courseOffering.course.name} • {report.courseOffering.term.semester} {report.courseOffering.term.academicYear}
          </p>
          <p className="mt-1 text-sm text-gray-500">Instructor: {report.instructor.name} • {report.courseOffering.course.major.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${styles[report.status] || styles.DRAFT}`}>{statusLabel(report.status)}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">{completion.answered}/{completion.total} answered</span>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Students" value={report.courseOffering._count.enrollments} />
        <Metric label="Blueprints" value={report.courseOffering._count.blueprints} />
        <Metric label="Assessments" value={report.courseOffering._count.gradeAssessments} />
        <Metric label="Responses" value={completion.answered} />
      </section>

      <section className="space-y-4">
        {COURSE_PROGRESS_REPORT_PROMPTS.map((item, index) => (
          <section key={item.key} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">{index + 1}</span>
              <div>
                <h2 className="font-semibold text-gray-900">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">{item.prompt}</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {report.responses?.[item.key]?.trim() || "No response provided."}
            </p>
          </section>
        ))}
      </section>

      {report.comments.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Coordinator Notes</h2>
          <div className="mt-3 space-y-2">
            {report.comments.map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                <p>{item.content}</p>
                <p className="mt-1 text-xs text-gray-400">{item.coordinator.name} • {new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Review Decision</h2>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          placeholder="Add a note. Required when requesting revision."
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button disabled={saving} onClick={() => review("REQUEST_REVISION")} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
            Request Revision
          </button>
          <button disabled={saving} onClick={() => review("APPROVE")} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
            Approve Report
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
