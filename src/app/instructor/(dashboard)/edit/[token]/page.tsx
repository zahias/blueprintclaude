"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TopicBuilder from "@/components/TopicBuilder";
import QADashboard from "@/components/QADashboard";
import { SEMESTERS, getAcademicYears, BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";
import { type BlueprintTopicEntry, getSubmitIssues } from "@/lib/types";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  admin?: { name: string } | null;
  coordinator?: { name: string } | null;
}

interface LO {
  id: string;
  code: string;
  description: string;
}

interface TopicLOData {
  learningOutcomeId: string;
  learningOutcome: { code: string; description: string };
}

interface TopicData {
  id: string;
  name: string;
  description: string | null;
  los: TopicLOData[];
}

export default function InstructorEditBlueprintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [topics, setTopics] = useState<TopicData[]>([]);
  const [los, setLos] = useState<LO[]>([]);

  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [duration, setDuration] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [status, setStatus] = useState("");
  const [courseId, setCourseId] = useState("");

  const [topicEntries, setTopicEntries] = useState<BlueprintTopicEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showMobileQA, setShowMobileQA] = useState(false);
  const dirtyRef = useRef(false);

  const academicYears = getAcademicYears();

  // Load blueprint data
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/blueprints/${token}`);
      if (!res.ok) {
        router.push("/instructor");
        return;
      }
      const bp = await res.json();

      setTitle(bp.title);
      setExamDate(bp.examDate ? bp.examDate.split("T")[0] : "");
      setDuration(bp.duration?.toString() || "");
      setTotalMarks(bp.totalMarks.toString());
      setSemester(bp.semester || "");
      setAcademicYear(bp.academicYear || "");
      setInstructorName(bp.instructorName);
      setStatus(bp.status);
      setCourseId(bp.courseId);
      setComments(bp.comments || []);

      // Load course topics and LOs
      const [topicsRes, losRes] = await Promise.all([
        fetch(`/api/courses/${bp.courseId}/topics`).then((r) => r.json()),
        fetch(`/api/courses/${bp.courseId}/los`).then((r) => r.json()),
      ]);
      setTopics(topicsRes);
      setLos(losRes);

      // Map existing blueprint topics to entries
      const entries: BlueprintTopicEntry[] = bp.topics.map((bt: {
        topicId: string;
        questionCount: number;
        totalPoints: number;
        bloomRemember: number;
        bloomUnderstand: number;
        bloomApply: number;
        bloomAnalyze: number;
        bloomEvaluate: number;
        bloomCreate: number;
        questionTypes: { questionType: string; count: number }[];
      }) => ({
        topicId: bt.topicId,
        questionCount: bt.questionCount,
        totalPoints: bt.totalPoints,
        bloomRemember: bt.bloomRemember,
        bloomUnderstand: bt.bloomUnderstand,
        bloomApply: bt.bloomApply,
        bloomAnalyze: bt.bloomAnalyze,
        bloomEvaluate: bt.bloomEvaluate,
        bloomCreate: bt.bloomCreate,
        questionTypes: bt.questionTypes.map((qt: { questionType: string; count: number }) => ({
          questionType: qt.questionType,
          count: qt.count,
        })),
      }));
      setTopicEntries(entries);
      setLoading(false);
    }
    load();
  }, [token, router]);

  // Build the shape needed by QADashboard
  const blueprintForQA = {
    totalMarks: parseFloat(totalMarks) || 0,
    course: { los: los.map((l) => ({ id: l.id, code: l.code, description: l.description })) },
    topics: topicEntries.map((te) => {
      const topic = topics.find((t) => t.id === te.topicId);
      return {
        ...te,
        topic: {
          name: topic?.name || "",
          los: topic?.los.map((tl) => ({
            learningOutcomeId: tl.learningOutcomeId,
            learningOutcome: { code: tl.learningOutcome.code },
          })) || [],
        },
        questionTypes: te.questionTypes,
      };
    }),
  };

  // Validation
  const totalPointsCalc = topicEntries.reduce((s, te) => s + te.totalPoints, 0);
  const examTotalCalc = parseFloat(totalMarks) || 0;
  const submitIssues = getSubmitIssues(topicEntries, topics, examTotalCalc);
  const canSubmit = submitIssues.length === 0;

  const handleSave = useCallback(async (newStatus: "DRAFT" | "SUBMITTED") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/blueprints/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          instructorName,
          title,
          examDate: examDate || null,
          duration: duration ? parseInt(duration) : null,
          totalMarks,
          semester: semester || null,
          academicYear: academicYear || null,
          topics: topicEntries,
          status: newStatus,
        }),
      });

      if (res.ok) {
        dirtyRef.current = false;
        setSaved(true);
        setStatus(newStatus);
        setTimeout(() => setSaved(false), 3000);
        if (newStatus === "SUBMITTED") {
          router.push("/instructor");
        }
      }
    } finally {
      setSaving(false);
    }
  }, [token, courseId, instructorName, title, examDate, duration, totalMarks, semester, academicYear, topicEntries, router]);

  // Auto-save every 30 seconds when dirty + editable
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current && !saving && (status === "DRAFT" || status === "NEEDS_REVISION")) {
        handleSave("DRAFT").then(() => {
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        });
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [saving, status, handleSave]);

  if (loading) return <div className="text-gray-500">Loading blueprint...</div>;

  const canEdit = status === "DRAFT" || status === "NEEDS_REVISION";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => router.push("/instructor")} className="text-indigo-600 text-sm mb-1 hover:text-indigo-800">
            ← Back to My Blueprints
          </button>
          <h2 className="text-xl font-bold text-gray-900">Edit Blueprint</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BLUEPRINT_STATUS_COLORS[status]}`}>
              {BLUEPRINT_STATUS_LABELS[status]}
            </span>
            <span className="text-sm text-gray-500">{title} • {totalMarks} marks</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-sm font-medium ${totalPointsCalc === examTotalCalc ? "text-green-600" : "text-amber-600"}`}>
            {totalPointsCalc} / {examTotalCalc} pts
          </span>
          {saved && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Saved!</span>}
          {autoSaved && <span className="text-xs text-gray-400">Auto-saved</span>}
          {canEdit && (
            <>
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving || topicEntries.length === 0}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave("SUBMITTED")}
                disabled={saving || !canSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                title={!canSubmit ? "Resolve all issues below before submitting" : ""}
              >
                {saving ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Submit checklist — shown when there are issues */}
      {canEdit && !canSubmit && topicEntries.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Fix these issues to submit:</p>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-0.5">
            {submitIssues.map((issue, i) => <li key={i}>{issue}</li>)}
          </ul>
        </div>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700">
          This blueprint is currently <strong>{(BLUEPRINT_STATUS_LABELS[status] || status).toLowerCase()}</strong> and cannot be edited.
        </div>
      )}

      {/* Reviewer comments */}
      {comments.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Reviewer Comments</h3>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span className="font-medium">{c.coordinator?.name || c.admin?.name || "Reviewer"}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-800">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata row */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); dirtyRef.current = true; }}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); dirtyRef.current = true; }}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            >
              <option value="">—</option>
              {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <select
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); dirtyRef.current = true; }}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            >
              <option value="">—</option>
              {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Total Marks</label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) => { setTotalMarks(e.target.value); dirtyRef.current = true; }}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
            <div className="relative">
              <input
                type="number"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); dirtyRef.current = true; }}
                disabled={!canEdit}
                className="w-full px-2 py-1.5 pr-10 border border-gray-300 rounded text-sm disabled:bg-gray-50"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {canEdit ? (
            <TopicBuilder topics={topics} entries={topicEntries} onChange={(entries) => { setTopicEntries(entries); dirtyRef.current = true; }} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-500 text-sm">
              Topic editing is disabled for {(BLUEPRINT_STATUS_LABELS[status] || status).toLowerCase()} blueprints.
            </div>
          )}
        </div>
        <div className="xl:col-span-1">
          <div className="sticky top-20 hidden xl:block">
            <QADashboard blueprint={blueprintForQA} />
          </div>
        </div>
      </div>

      {/* Mobile QA floating button */}
      <button
        onClick={() => setShowMobileQA(true)}
        className="fixed bottom-4 right-4 xl:hidden bg-indigo-600 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center z-40 hover:bg-indigo-700 transition"
      >
        {!canSubmit && topicEntries.length > 0 ? (
          <span className="text-sm font-bold">{submitIssues.length}</span>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )}
      </button>

      {/* Mobile QA slide-over */}
      {showMobileQA && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMobileQA(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">QA Dashboard</h3>
              <button onClick={() => setShowMobileQA(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <QADashboard blueprint={blueprintForQA} />
          </div>
        </div>
      )}
    </div>
  );
}
