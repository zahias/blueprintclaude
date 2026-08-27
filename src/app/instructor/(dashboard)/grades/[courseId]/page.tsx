"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GradeDistributionChart from "@/components/GradeDistributionChart";
import { STATUS_COLORS, statusLabel } from "@/lib/constants";
import { assessmentWeightTotal, getGradeDistribution, getGradeInsights, getGradeStats, getLetterGrade, getStudentWeightedPercent, GRADE_SCALE } from "@/lib/grades";

interface Student {
  id: string;
  universityStudentId: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
}

interface Enrollment {
  id: string;
  group: string | null;
  student: Student;
}

interface BlueprintOption {
  id: string;
  title: string;
  totalMarks: number;
  status: string;
}

interface GradeEntry {
  studentId: string;
  rawPoints: number | null;
}

interface Assessment {
  id: string;
  name: string;
  weightPercent: number;
  maxPoints: number;
  status: string;
  blueprintId: string | null;
  blueprint?: { title: string; totalMarks: number } | null;
  entries: GradeEntry[];
  comments: { id: string; content: string; createdAt: string; coordinator: { name: string } }[];
}

interface GradebookComment {
  id: string;
  content: string;
  createdAt: string;
  coordinator: { name: string };
}

interface Gradebook {
  id: string;
  code: string;
  name: string;
  major: { name: string };
  editable?: boolean;
  activeTerm?: { semester: string; academicYear: string } | null;
  blueprints: BlueprintOption[];
  enrollments: Enrollment[];
  gradeAssessments: Assessment[];
  gradebookStatus: string;
  gradebookComments: GradebookComment[];
}

function statusBadge(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
}

function gradebookStatusLabel(status: string) {
  return statusLabel(status);
}

export default function InstructorCourseGradebookPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"assessments" | "matrix" | "preview">("assessments");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assessmentForm, setAssessmentForm] = useState({ name: "", weightPercent: "", maxPoints: "" });
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [editingAssessmentForm, setEditingAssessmentForm] = useState({ name: "", weightPercent: "", maxPoints: "" });
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});

  async function loadGradebook() {
    const res = await fetch(`/api/instructor/courses/${courseId}/gradebook`);
    if (res.ok) {
      const data = await res.json();
      setGradebook(data);
      const drafts: Record<string, string> = {};
      data.gradeAssessments.forEach((assessment: Assessment) => {
        assessment.entries.forEach((entry) => {
          drafts[`${assessment.id}:${entry.studentId}`] = entry.rawPoints === null ? "" : String(entry.rawPoints);
        });
      });
      setGradeDrafts(drafts);
      setEditingAssessmentId(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const analytics = useMemo(() => {
    if (!gradebook) return null;
    const assessments = gradebook.gradeAssessments.map((assessment) => ({
      id: assessment.id,
      name: assessment.name,
      weightPercent: assessment.weightPercent,
      maxPoints: assessment.maxPoints,
      status: assessment.status,
      entries: assessment.entries,
    }));
    const rows = gradebook.enrollments.map((enrollment) => {
      const percent = getStudentWeightedPercent(enrollment.student.id, assessments);
      const grade = getLetterGrade(percent);
      return { enrollment, percent, ...grade };
    });
    const percents = rows.map((row) => row.percent);
    return {
      rows,
      distribution: getGradeDistribution(percents),
      stats: getGradeStats(percents),
      insights: getGradeInsights(percents, assessments, gradebook.enrollments.length),
      percents,
      complete: gradebook.gradeAssessments.length > 0 && gradebook.gradebookStatus === "APPROVED",
    };
  }, [gradebook]);

  async function addAssessment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch(`/api/instructor/courses/${courseId}/assessments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessmentForm),
    });
    const data = await res.json();
    if (res.ok) {
      setAssessmentForm({ name: "", weightPercent: "", maxPoints: "" });
      setMessage("Assessment added.");
      setStep("assessments");
      await loadGradebook();
    } else {
      setError(data.error || "Could not add assessment");
    }
  }

  function startEditAssessment(assessment: Assessment) {
    setEditingAssessmentId(assessment.id);
    setEditingAssessmentForm({
      name: assessment.name,
      weightPercent: String(assessment.weightPercent),
      maxPoints: String(assessment.maxPoints),
    });
  }

  async function saveAssessmentEdit(assessmentId: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/instructor/courses/${courseId}/assessments/${assessmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingAssessmentForm),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Assessment updated.");
      setEditingAssessmentId(null);
      await loadGradebook();
    } else {
      setError(data.error || "Could not update assessment");
    }
  }

  async function saveGrades() {
    if (!gradebook) return;
    setSaving(true);
    setError("");
    setMessage("");
    const grades = Object.entries(gradeDrafts).map(([key, value]) => {
      const [assessmentId, studentId] = key.split(":");
      return { assessmentId, studentId, rawPoints: value === "" ? null : Number(value) };
    });
    const res = await fetch(`/api/instructor/courses/${courseId}/grades`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grades }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Saved ${data.updated} grade entries.`);
      await loadGradebook();
    } else {
      setError(data.error || "Could not save grades");
    }
    setSaving(false);
  }

  async function submitGradebook() {
    setError("");
    setMessage("");
    const res = await fetch(`/api/instructor/courses/${courseId}/grades/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Submitted the full gradebook (${data.submitted} assessments) for coordinator approval.`);
      await loadGradebook();
    } else {
      setError(data.error || "Could not submit gradebook");
    }
  }

  if (loading) return <div className="text-gray-500">Loading gradebook...</div>;
  if (!gradebook) return <div className="text-red-500">Gradebook not found</div>;

  const weightTotal = assessmentWeightTotal(gradebook.gradeAssessments);
  const editable = gradebook.editable !== false;
  const hasRoster = gradebook.enrollments.length > 0;
  const gradeEntryEnabled = editable && hasRoster && gradebook.gradeAssessments.length > 0;
  const currentStatus = gradebook.gradeAssessments.length === 0 ? "NOT_STARTED" : gradebook.gradebookStatus;
  const gradebookLocked = ["SUBMITTED", "APPROVED"].includes(gradebook.gradebookStatus);
  const revisionComments = gradebook.gradebookComments || [];

  return (
    <div>
      <Link href="/instructor/grades" className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block">
        &larr; Back to Courses
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{gradebook.code} — {gradebook.name}</h1>
          <p className="text-sm text-gray-500">
            {gradebook.major.name} gradebook
            {gradebook.activeTerm ? ` • ${gradebook.activeTerm.semester} ${gradebook.activeTerm.academicYear}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {!editable && <div className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700">Read only</div>}
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${statusBadge(currentStatus === "NOT_STARTED" ? "DRAFT" : currentStatus)}`}>
            {gradebookStatusLabel(currentStatus)}
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${weightTotal === 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            Weights: {weightTotal} / 100%
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {error || message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ["assessments", "1. Assessments"],
          ["matrix", "2. Grade Matrix"],
          ["preview", "3. Preview & Submit"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStep(key as typeof step)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${step === key ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!hasRoster && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Roster has not been imported by the coordinator yet.
        </div>
      )}

      {currentStatus === "NEEDS_REVISION" && revisionComments.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-amber-900">Coordinator revision notes</h2>
            <button onClick={() => setStep("matrix")} className="text-xs font-semibold text-amber-800 underline">Back to Matrix</button>
          </div>
          <div className="space-y-2">
            {revisionComments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm text-amber-900">
                <div className="mb-1 flex justify-between text-xs text-amber-700">
                  <span>{comment.coordinator.name}</span>
                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p>{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "assessments" && (
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">1. Assessments</h2>
          {gradebookLocked && <p className="text-xs text-amber-600 mb-3">Assessment setup is locked while the gradebook is pending approval or approved. If revision is requested, editable fields reopen.</p>}
          {!editable && <p className="text-xs text-gray-500 mb-3">Previous-term gradebooks are read-only.</p>}
          <form onSubmit={addAssessment} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <input value={assessmentForm.name} disabled={gradebookLocked || !editable} onChange={(e) => setAssessmentForm({ ...assessmentForm, name: e.target.value })} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" placeholder="Assessment name" required />
            <input value={assessmentForm.weightPercent} disabled={gradebookLocked || !editable} onChange={(e) => setAssessmentForm({ ...assessmentForm, weightPercent: e.target.value })} type="number" step="0.01" min="0" className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" placeholder="Weight %" required />
            <input value={assessmentForm.maxPoints} disabled={gradebookLocked || !editable} onChange={(e) => setAssessmentForm({ ...assessmentForm, maxPoints: e.target.value })} type="number" step="0.01" min="0" className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" placeholder="Max pts" required />
            <button disabled={gradebookLocked || !editable} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Add</button>
          </form>
          <div className="space-y-2">
            {gradebook.gradeAssessments.map((assessment) => (
              <div key={assessment.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                {editingAssessmentId === assessment.id ? (
                  <div className="grid flex-1 grid-cols-1 md:grid-cols-5 gap-2">
                    <input value={editingAssessmentForm.name} onChange={(e) => setEditingAssessmentForm({ ...editingAssessmentForm, name: e.target.value })} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input value={editingAssessmentForm.weightPercent} onChange={(e) => setEditingAssessmentForm({ ...editingAssessmentForm, weightPercent: e.target.value })} type="number" step="0.01" min="0" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input value={editingAssessmentForm.maxPoints} onChange={(e) => setEditingAssessmentForm({ ...editingAssessmentForm, maxPoints: e.target.value })} type="number" step="0.01" min="0" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveAssessmentEdit(assessment.id)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium">Save</button>
                      <button type="button" onClick={() => setEditingAssessmentId(null)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assessment.name} <span className="text-gray-400">({assessment.weightPercent}% / {assessment.maxPoints} pts)</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editable && !gradebookLocked && (
                        <button type="button" onClick={() => startEditAssessment(assessment)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                      )}
                      {(!editable || gradebookLocked) && (
                        <span className="text-xs font-medium text-gray-400">Locked</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setStep("matrix")} disabled={!gradeEntryEnabled} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Continue to Grade Matrix
            </button>
          </div>
        </section>
      )}

      {step === "matrix" && (
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">2. Grade Matrix</h2>
            <p className="text-sm text-gray-500">Enter raw points. Submitted and approved assessments are read-only.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={saveGrades} disabled={saving || !editable || gradebookLocked || gradebook.gradeAssessments.length === 0} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              {saving ? "Saving..." : "Save Grades"}
            </button>
            <button onClick={() => setStep("preview")} disabled={!gradeEntryEnabled} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              Preview
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 min-w-56">Student</th>
                {gradebook.gradeAssessments.map((assessment) => (
                  <th key={assessment.id} className="text-center px-3 py-2 min-w-32">
                    <span>{assessment.name}</span>
                  </th>
                ))}
                <th className="text-center px-3 py-2">Current %</th>
                <th className="text-center px-3 py-2">Letter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradebook.enrollments.map((enrollment) => {
                const row = analytics?.rows.find((item) => item.enrollment.id === enrollment.id);
                return (
                  <tr key={enrollment.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{enrollment.student.lastName}, {enrollment.student.firstName}</p>
                      <p className="text-xs text-gray-400">
                        {enrollment.student.universityStudentId || enrollment.student.email || "No ID"}
                        {enrollment.group ? ` • ${enrollment.group}` : ""}
                      </p>
                    </td>
                    {gradebook.gradeAssessments.map((assessment) => {
                      const key = `${assessment.id}:${enrollment.student.id}`;
                      const locked = !editable || gradebookLocked;
                      return (
                        <td key={assessment.id} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={assessment.maxPoints}
                            value={gradeDrafts[key] || ""}
                            disabled={locked}
                            onChange={(e) => setGradeDrafts({ ...gradeDrafts, [key]: e.target.value })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-50"
                            placeholder={`/${assessment.maxPoints}`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-medium">{row?.percent ?? 0}%</td>
                    <td className="px-3 py-2 text-center font-semibold">{row?.letter ?? "F"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {step === "preview" && analytics && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Preview & Submit</h2>
              <p className="text-sm text-gray-500">Review grade distribution insights before submitting the full gradebook.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("matrix")} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Back to Matrix</button>
              <span className={`text-xs font-semibold px-2 py-2 rounded-full ${analytics.complete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {analytics.complete ? "Final" : "In progress"}
              </span>
            </div>
          </div>
          <div className="grid gap-3 mb-5">
            {analytics.insights.map((insight) => (
              <div key={insight.metricKey} className={`rounded-lg px-4 py-3 text-sm border ${insight.severity === "critical" ? "bg-red-50 border-red-200 text-red-800" : insight.severity === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{insight.title}</p>
                  <button onClick={() => setStep("matrix")} className="shrink-0 text-xs font-semibold underline">Back to Matrix</button>
                </div>
                <p>{insight.detail}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
            <Stat label="Average" value={`${analytics.stats.average}%`} />
            <Stat label="Median" value={`${analytics.stats.median}%`} />
            <Stat label="Highest" value={`${analytics.stats.highest}%`} />
            <Stat label="Lowest" value={`${analytics.stats.lowest}%`} />
            <Stat label="Std Dev" value={`${analytics.stats.standardDeviation}%`} />
            <Stat label="Pass" value={analytics.stats.passCount} />
            <Stat label="Fail" value={analytics.stats.failCount} />
          </div>
          <div className="mb-5">
            <GradeDistributionChart percents={analytics.percents} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 xl:grid-cols-11 gap-2">
            {GRADE_SCALE.map((grade) => (
              <div key={grade.letter} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="font-bold text-gray-900">{grade.letter}</p>
                <p className="text-xl font-bold text-indigo-600">{analytics.distribution[grade.letter]}</p>
                <p className="text-[10px] text-gray-400">{grade.qualityPoints} QP</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={submitGradebook} disabled={!editable || gradebookLocked || weightTotal !== 100 || gradebook.gradeAssessments.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              Submit Full Gradebook
            </button>
          </div>
        </section>
      )}
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
