"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { COURSE_PROGRESS_REPORT_PROMPTS } from "@/lib/constants";

type ResponseMap = Record<string, string>;

interface Report {
  id?: string;
  status: string;
  responses?: ResponseMap;
  comments?: { id: string; content: string; createdAt: string; coordinator: { name: string } }[];
}

interface ResponseData {
  offering: {
    editable: boolean;
    term: { semester: string; academicYear: string };
    course: { code: string; name: string; major: { name: string } };
    _count: { enrollments: number; blueprints: number; gradeAssessments: number };
  };
  report: Report;
}

const emptyReport: Report = {
  status: "DRAFT",
  responses: {},
  comments: [],
};

export default function InstructorCourseReportDetailPage() {
  const params = useParams<{ courseId: string }>();
  const [data, setData] = useState<ResponseData | null>(null);
  const [report, setReport] = useState<Report>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/instructor/course-reports/${params.courseId}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "Could not load course report.");
        setData(payload);
        setReport({ ...emptyReport, ...payload.report, responses: payload.report?.responses || {} });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.courseId]);

  const locked = !data?.offering.editable || report.status === "SUBMITTED" || report.status === "APPROVED";
  const completion = useMemo(() => {
    const answered = COURSE_PROGRESS_REPORT_PROMPTS.filter((item) => (report.responses?.[item.key] || "").trim().length > 0).length;
    return { answered, total: COURSE_PROGRESS_REPORT_PROMPTS.length };
  }, [report.responses]);

  async function save(status: "DRAFT" | "SUBMITTED") {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/instructor/course-reports/${params.courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: report.responses || {}, status }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(payload.error || "Could not save course report.");
      return;
    }
    setReport({ ...emptyReport, ...payload, responses: payload.responses || {} });
    setMessage(status === "SUBMITTED" ? "Course progress report submitted for coordinator review." : "Draft saved.");
  }

  function updateResponse(key: string, value: string) {
    setReport((current) => ({
      ...current,
      responses: {
        ...(current.responses || {}),
        [key]: value,
      },
    }));
  }

  if (loading) return <div className="text-gray-500">Loading course progress report...</div>;
  if (error && !data) return <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/instructor/course-reports" className="text-sm text-indigo-600 hover:text-indigo-800">Back to Course Reports</Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Course Progress Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              {data.offering.course.code} — {data.offering.course.name} • {data.offering.term.semester} {data.offering.term.academicYear}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {data.offering.course.major.name} • {data.offering._count.enrollments} registered students
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              {completion.answered}/{completion.total} answered
            </span>
            <button disabled={locked || saving} onClick={() => save("DRAFT")} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button disabled={!data.offering.editable || report.status === "SUBMITTED" || report.status === "APPROVED" || saving} onClick={() => save("SUBMITTED")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              Submit Report
            </button>
          </div>
        </div>
      </div>

      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {report.status === "NEEDS_REVISION" && report.comments && report.comments.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Coordinator revision notes</h2>
          <div className="mt-3 space-y-2">
            {report.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-white/70 p-3 text-sm text-amber-900">
                <p>{comment.content}</p>
                <p className="mt-1 text-xs text-amber-700">{comment.coordinator.name} • {new Date(comment.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {locked && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          This report is read only because it is {report.status === "SUBMITTED" ? "pending coordinator approval" : report.status === "APPROVED" ? "approved" : "from a previous term"}.
        </div>
      )}

      <section className="space-y-4">
        {COURSE_PROGRESS_REPORT_PROMPTS.map((item, index) => (
          <label key={item.key} className="block rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">{index + 1}</span>
              <div>
                <h2 className="font-semibold text-gray-900">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">{item.prompt}</p>
              </div>
            </div>
            <textarea
              disabled={locked}
              value={report.responses?.[item.key] || ""}
              onChange={(event) => updateResponse(item.key, event.target.value)}
              rows={7}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              placeholder="Enter your response..."
            />
          </label>
        ))}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    NEEDS_REVISION: "bg-amber-100 text-amber-700",
  };
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${styles[status] || styles.DRAFT}`}>{status.replace("_", " ")}</span>;
}
