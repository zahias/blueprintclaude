"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";
import { InstructorNewBlueprintBuilder } from "@/components/InstructorNewBlueprintBuilder";

interface Blueprint {
  id: string;
  accessToken: string;
  title: string;
  instructorName: string;
  semester: string | null;
  academicYear: string | null;
  totalMarks: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  course: {
    code: string;
    name: string;
    major: { name: string };
  };
  _count: { topics: number; comments: number };
}

interface ActiveTerm {
  id: string;
  semester: string;
  academicYear: string;
}

interface InstructorCourse {
  id: string;
  code: string;
  name: string;
  editable?: boolean;
  term?: { semester: string; academicYear: string } | null;
  major: { id?: string; name: string };
  _count: { enrollments?: number; blueprints?: number; gradeAssessments?: number };
  gradebookStatus?: string | null;
}

interface CourseReportRow {
  id: string;
  editable: boolean;
  term: { semester: string; academicYear: string };
  course: { id: string; code: string; name: string; major: { name: string } };
  report: { id: string; status: string; updatedAt: string } | null;
}

export default function InstructorDashboard() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500">Loading instructor dashboard...</div>}>
      <InstructorDashboardContent />
    </Suspense>
  );
}

function InstructorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "new" ? "new" : "list";
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("bp_status") || "";
    return "";
  });
  const [activeTerm, setActiveTerm] = useState<ActiveTerm | null>(null);
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [courseReports, setCourseReports] = useState<CourseReportRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadBlueprints() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const url = `/api/instructor/blueprints?${params.toString()}`;
    const [blueprintsRes, termRes, coursesRes, reportsRes] = await Promise.all([
      fetch(url),
      fetch("/api/terms/active"),
      fetch("/api/instructor/courses"),
      fetch("/api/instructor/course-reports"),
    ]);
    if (blueprintsRes.ok) setBlueprints(await blueprintsRes.json());
    if (coursesRes.ok) setCourses(await coursesRes.json());
    if (reportsRes.ok) setCourseReports(await reportsRes.json());
    if (termRes.ok) {
      const term = await termRes.json();
      setActiveTerm(term?.id ? term : null);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    sessionStorage.setItem("bp_status", statusFilter);
    loadBlueprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/blueprint/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleWithdraw(bp: Blueprint) {
    if (!confirm(`Withdraw "${bp.title}" back to draft? You can re-submit later.`)) return;
    setActionLoading(bp.id);
    try {
      const res = await fetch(`/api/blueprints/${bp.accessToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      if (res.ok) loadBlueprints();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDuplicate(bp: Blueprint) {
    setActionLoading(bp.id);
    setActionError("");
    try {
      const res = await fetch(`/api/blueprints/${bp.accessToken}`);
      if (!res.ok) {
        setActionError("Could not load the blueprint to duplicate.");
        return;
      }
      const data = await res.json();
      const payload = {
        courseId: data.courseId,
        instructorName: data.instructorName,
        title: `${data.title} (Copy)`,
        examDate: null,
        duration: data.duration,
        totalMarks: String(data.totalMarks),
        semester: data.semester,
        academicYear: data.academicYear,
        topics: data.topics.map((t: { topicId: string; questionCount: number; totalPoints: number; bloomRemember: number; bloomUnderstand: number; bloomApply: number; bloomAnalyze: number; bloomEvaluate: number; bloomCreate: number }) => ({
          topicId: t.topicId,
          questionCount: t.questionCount,
          totalPoints: t.totalPoints,
          bloomRemember: t.bloomRemember,
          bloomUnderstand: t.bloomUnderstand,
          bloomApply: t.bloomApply,
          bloomAnalyze: t.bloomAnalyze,
          bloomEvaluate: t.bloomEvaluate,
          bloomCreate: t.bloomCreate,
        })),
        status: "DRAFT",
      };
      const createRes = await fetch("/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        router.push(`/instructor/edit/${created.accessToken}`);
      } else {
        setActionError("Could not create the duplicate blueprint.");
      }
    } catch {
      setActionError("Network error while duplicating the blueprint.");
    } finally {
      setActionLoading(null);
    }
  }

  const activeBlueprints = activeTerm
    ? blueprints.filter((bp) => bp.semester === activeTerm.semester && bp.academicYear === activeTerm.academicYear)
    : [];
  const archivedBlueprints = activeTerm
    ? blueprints.filter((bp) => bp.semester !== activeTerm.semester || bp.academicYear !== activeTerm.academicYear)
    : blueprints;
  const activeCourses = courses.filter((course) => course.editable);
  const gradeNeedsRevision = activeCourses.filter((course) => course.gradebookStatus === "NEEDS_REVISION");
  const gradePending = activeCourses.filter((course) => course.gradebookStatus === "SUBMITTED");
  const gradeDraft = activeCourses.filter((course) => {
    const status = course.gradebookStatus;
    return status !== "NEEDS_REVISION" && status !== "SUBMITTED" && status !== "APPROVED";
  });
  const activeReports = courseReports.filter((row) => row.editable);
  const reportsNeedRevision = activeReports.filter((row) => row.report?.status === "NEEDS_REVISION");
  const reportsPending = activeReports.filter((row) => row.report?.status === "SUBMITTED");
  const reportsDraft = activeReports.filter((row) => !row.report || row.report.status === "DRAFT");
  const blueprintsNeedRevision = activeBlueprints.filter((bp) => bp.status === "NEEDS_REVISION");
  const blueprintsDraft = activeBlueprints.filter((bp) => bp.status === "DRAFT");
  const blueprintsPending = activeBlueprints.filter((bp) => bp.status === "SUBMITTED");

  function BlueprintTable({ items, archive = false }: { items: Blueprint[]; archive?: boolean }) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Title</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Course</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Term</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Questions</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Comments</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((bp) => (
              <tr key={bp.id} className={archive ? "bg-gray-50/50" : "hover:bg-gray-50"}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{bp.title}</p>
                  <p className="text-xs text-gray-400">{new Date(bp.updatedAt).toLocaleDateString()}</p>
                  {!archive && bp.status === "NEEDS_REVISION" && bp._count.comments > 0 && (
                    <p className="mt-1 text-xs font-medium text-amber-700">Coordinator notes need review</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{bp.course.code}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-600">
                  {bp.semester && bp.academicYear ? `${bp.semester} ${bp.academicYear}` : "Legacy"}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-700">{bp.totalMarks}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${BLUEPRINT_STATUS_COLORS[bp.status]}`}>
                    {BLUEPRINT_STATUS_LABELS[bp.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {bp._count.comments > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      {bp._count.comments}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Link href={`/blueprint/${bp.accessToken}`} className="text-indigo-600 hover:text-indigo-800 text-xs">
                    View
                  </Link>
                  {!archive && (bp.status === "DRAFT" || bp.status === "NEEDS_REVISION") && (
                    <Link href={`/instructor/edit/${bp.accessToken}`} className="text-indigo-600 hover:text-indigo-800 text-xs">
                      Edit
                    </Link>
                  )}
                  {!archive && bp.status === "SUBMITTED" && (
                    <button
                      onClick={() => handleWithdraw(bp)}
                      disabled={actionLoading === bp.id}
                      className="text-amber-600 hover:text-amber-800 text-xs disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  )}
                  {!archive && (
                    <button
                      onClick={() => handleDuplicate(bp)}
                      disabled={actionLoading === bp.id}
                      className="text-gray-500 hover:text-gray-700 text-xs disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                  )}
                  <button onClick={() => copyToken(bp.accessToken, bp.id)} className="text-gray-400 hover:text-gray-600 text-xs">
                    {copiedId === bp.id ? "Copied!" : "Copy Link"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{actionError}</div>
      )}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blueprints</h1>
            <p className="text-sm text-gray-500 mt-1">Review existing blueprints or build a new one for the active semester.</p>
          </div>
          <Link
            href={activeTab === "new" ? "/instructor" : "/instructor?tab=new"}
            className={activeTab === "new"
              ? "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              : "px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"}
          >
            {activeTab === "new" ? "Back to My Blueprints" : "Create Blueprint"}
          </Link>
        </div>
        <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1">
          <Link
            href="/instructor"
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "list" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            My Blueprints
          </Link>
          <Link
            href="/instructor?tab=new"
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "new" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            New Blueprint
          </Link>
        </div>
      </div>

      {activeTab === "new" ? <InstructorNewBlueprintBuilder /> : (
      <>

      <section className="mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <WorkMetric label="Needs action" value={blueprintsNeedRevision.length + gradeNeedsRevision.length + reportsNeedRevision.length} tone="amber" />
          <WorkMetric label="Drafts to finish" value={blueprintsDraft.length + gradeDraft.length + reportsDraft.length} tone="gray" />
          <WorkMetric label="Pending Review" value={blueprintsPending.length + gradePending.length + reportsPending.length} tone="blue" />
        </div>

        {(blueprintsNeedRevision.length > 0 || gradeNeedsRevision.length > 0 || reportsNeedRevision.length > 0) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">Needs action</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {blueprintsNeedRevision.slice(0, 3).map((bp) => (
                <ActionLink key={bp.id} href={`/instructor/edit/${bp.accessToken}`} label={`${bp.course.code}: revise blueprint`} detail={bp.title} tone="amber" />
              ))}
              {gradeNeedsRevision.slice(0, 3).map((course) => (
                <ActionLink key={course.id} href={`/instructor/grades/${course.id}`} label={`${course.code}: revise grades`} detail={course.name} tone="amber" />
              ))}
              {reportsNeedRevision.slice(0, 3).map((row) => (
                <ActionLink key={row.id} href={`/instructor/course-reports/${row.course.id}`} label={`${row.course.code}: revise course report`} detail={row.course.name} tone="amber" />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <QuickAction href="/instructor?tab=new" title="Create Blueprint" detail="Plan exam topics, Bloom levels, and question formats." />
          <QuickAction href="/instructor/grades" title="Open Grades" detail={`${activeCourses.length} active course${activeCourses.length === 1 ? "" : "s"} assigned.`} />
          <QuickAction href="/instructor/course-reports" title="Course Reports" detail={`${reportsDraft.length} draft/not-started report${reportsDraft.length === 1 ? "" : "s"}.`} />
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-1">
          {["", "DRAFT", "SUBMITTED", "APPROVED", "NEEDS_REVISION"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s ? BLUEPRINT_STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>
        {activeTerm && (
          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
            Active term: {activeTerm.semester} {activeTerm.academicYear}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : activeBlueprints.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-2">
            {activeTerm ? "No blueprints found for the active term." : "No active term is currently set."}
          </p>
          <Link href="/instructor?tab=new" className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Create a blueprint
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Active Term Blueprints</h2>
              <span className="text-xs text-gray-400">{activeBlueprints.length} blueprint{activeBlueprints.length === 1 ? "" : "s"}</span>
            </div>
            <BlueprintTable items={activeBlueprints} />
          </section>
        </div>
      )}
      {!loading && archivedBlueprints.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Archive</h2>
              <p className="text-xs text-gray-500">Previous-term and legacy blueprints are read-only here.</p>
            </div>
            <span className="text-xs text-gray-400">{archivedBlueprints.length} archived</span>
          </div>
          <BlueprintTable items={archivedBlueprints} archive />
        </section>
      )}
      </>
      )}
    </div>
  );
}

function WorkMetric({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "gray" }) {
  const tones = {
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    gray: "border-gray-200 bg-white text-gray-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ActionLink({ href, label, detail, tone }: { href: string; label: string; detail: string; tone: "amber" }) {
  const tones = {
    amber: "border-amber-200 bg-white/75 text-amber-900 hover:bg-white",
  };
  return (
    <Link href={href} className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs opacity-75">{detail}</p>
    </Link>
  );
}

function QuickAction({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </Link>
  );
}
