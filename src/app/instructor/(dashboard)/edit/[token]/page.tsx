"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import BlueprintBloomMatrix from "@/components/BlueprintBloomMatrix";
import BlueprintQuestionFormatMatrix from "@/components/BlueprintQuestionFormatMatrix";
import BlueprintQuestionReview from "@/components/BlueprintQuestionReview";
import BlueprintTopicSelector from "@/components/BlueprintTopicSelector";
import QADashboard from "@/components/QADashboard";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";
import {
  type BlueprintQuestionFormatEntry,
  type BlueprintTopicEntry,
  getQuestionFormatIssues,
  getSubmitIssues,
} from "@/lib/types";

const EXAM_TYPES = ["Midterm", "Final", "Major Exam"] as const;

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
  const [totalMarks, setTotalMarks] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [status, setStatus] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseLabel, setCourseLabel] = useState("");

  const [topicEntries, setTopicEntries] = useState<BlueprintTopicEntry[]>([]);
  const [questionFormats, setQuestionFormats] = useState<BlueprintQuestionFormatEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showMobileQA, setShowMobileQA] = useState(false);
  const dirtyRef = useRef(false);

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
      setTotalMarks(bp.totalMarks.toString());
      setSemester(bp.semester || "");
      setAcademicYear(bp.academicYear || "");
      setInstructorName(bp.instructorName);
      setStatus(bp.status);
      setCourseId(bp.courseId);
      setCourseLabel(bp.course ? `${bp.course.code} - ${bp.course.name}` : bp.courseId);
      setComments(bp.comments || []);
      setQuestionFormats((bp.questionFormats || []).map((format: BlueprintQuestionFormatEntry) => ({
        formatType: format.formatType,
        group: format.group,
        label: format.label,
        questionCount: format.questionCount,
        gradeWeight: format.gradeWeight,
      })));

      const courseParams = new URLSearchParams();
      if (bp.semester && bp.academicYear) {
        courseParams.set("semester", bp.semester);
        courseParams.set("academicYear", bp.academicYear);
      }
      const courseSuffix = courseParams.toString() ? `?${courseParams.toString()}` : "";

      // Load course topics and LOs for the blueprint's semester context
      const [topicsRes, losRes] = await Promise.all([
        fetch(`/api/courses/${bp.courseId}/topics${courseSuffix}`).then((r) => r.json()),
        fetch(`/api/courses/${bp.courseId}/los${courseSuffix}`).then((r) => r.json()),
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
        bloomPreset: "CUSTOM",
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
      };
    }),
  };

  // Validation
  const matrixQuestionTotal = topicEntries.reduce((s, te) => s + te.questionCount, 0);
  const examTotalCalc = parseFloat(totalMarks) || 0;
  const submitIssues = getSubmitIssues(topicEntries, topics, examTotalCalc);
  const questionFormatIssues = getQuestionFormatIssues(questionFormats, examTotalCalc, true);
  const allIssues = [...submitIssues, ...questionFormatIssues];
  const canSave = allIssues.length === 0;

  const reviewTopics = topicEntries.map((entry) => {
    const topic = topics.find((item) => item.id === entry.topicId);
    return {
      ...entry,
      topic: {
        name: topic?.name || "",
        los: topic?.los.map((lo) => ({
          learningOutcomeId: lo.learningOutcomeId,
          learningOutcome: { code: lo.learningOutcome.code, description: lo.learningOutcome.description },
        })) || [],
      },
    };
  });

  const handleSave = useCallback(async (newStatus: "DRAFT" | "SUBMITTED") => {
    if (!canSave) {
      setSaveError(allIssues.join(" "));
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const normalizedEntries = topicEntries.map((entry) => ({
        ...entry,
        totalPoints: entry.questionCount,
      }));
      const res = await fetch(`/api/blueprints/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          instructorName,
          title,
          examDate: null,
          duration: null,
          totalMarks,
          semester: semester || null,
          academicYear: academicYear || null,
          topics: normalizedEntries,
          questionFormats,
          status: newStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        dirtyRef.current = false;
        setSaved(true);
        setStatus(newStatus);
        setTimeout(() => setSaved(false), 3000);
        if (newStatus === "SUBMITTED") {
          router.push("/instructor");
        }
      } else {
        setSaveError(data.issues?.join(" ") || data.error || "Could not save blueprint.");
      }
    } finally {
      setSaving(false);
    }
  }, [token, canSave, allIssues, courseId, instructorName, title, totalMarks, semester, academicYear, topicEntries, questionFormats, router]);

  // Auto-save every 30 seconds when dirty + editable
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current && canSave && !saving && (status === "DRAFT" || status === "NEEDS_REVISION")) {
        handleSave("DRAFT").then(() => {
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        });
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [canSave, saving, status, handleSave]);

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
            <span className="text-sm text-gray-500">{title} • {totalMarks} questions</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-sm font-medium ${matrixQuestionTotal === examTotalCalc ? "text-green-600" : "text-amber-600"}`}>
            {matrixQuestionTotal} / {examTotalCalc} questions
          </span>
          {saved && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Saved!</span>}
          {autoSaved && <span className="text-xs text-gray-400">Auto-saved</span>}
          {canEdit && (
            <>
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving || !canSave}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
                title={!canSave ? "Complete all blueprint sections before saving a draft" : ""}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave("SUBMITTED")}
                disabled={saving || !canSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                title={!canSave ? "Resolve all issues below before submitting" : ""}
              >
                {saving ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Submit checklist — shown when there are issues */}
      {canEdit && allIssues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Current issues</p>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-0.5">
            {allIssues.map((issue, i) => <li key={i}>{issue}</li>)}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Exam Type</label>
            <select
              value={title}
              onChange={(e) => { setTitle(e.target.value); dirtyRef.current = true; }}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            >
              <option value="">Select type</option>
              {title && !EXAM_TYPES.includes(title as (typeof EXAM_TYPES)[number]) && (
                <option value={title}>{title}</option>
              )}
              {EXAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <div className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700">
              {semester || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <div className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700">
              {academicYear || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Total Questions</label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) => { setTotalMarks(e.target.value); dirtyRef.current = true; }}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {canEdit ? (
            <div className="space-y-5">
              <BlueprintTopicSelector topics={topics} entries={topicEntries} onChange={(entries) => { setTopicEntries(entries); dirtyRef.current = true; }} />
              <BlueprintBloomMatrix topics={topics} entries={topicEntries} onChange={(entries) => { setTopicEntries(entries); dirtyRef.current = true; }} />
              <BlueprintQuestionFormatMatrix
                formats={questionFormats}
                totalQuestionsExpected={examTotalCalc}
                onChange={(formats) => { setQuestionFormats(formats); dirtyRef.current = true; }}
              />
            </div>
          ) : (
            <BlueprintBloomMatrix topics={topics} entries={topicEntries} onChange={() => undefined} disabled />
          )}
        </div>
        <div className="xl:col-span-1">
          <div className="sticky top-20 hidden xl:block">
            <QADashboard blueprint={blueprintForQA} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <BlueprintQuestionReview
          examType={title}
          courseLabel={courseLabel}
          termLabel={`${semester} ${academicYear}`.trim()}
          totalQuestionsExpected={examTotalCalc}
          courseLOs={los}
          topics={reviewTopics}
          questionFormats={questionFormats}
          issues={allIssues}
        />
      </div>

      {/* Mobile QA floating button */}
      <button
        onClick={() => setShowMobileQA(true)}
        className="fixed bottom-4 right-4 xl:hidden bg-indigo-600 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center z-40 hover:bg-indigo-700 transition"
      >
        {!canSave && topicEntries.length > 0 ? (
          <span className="text-sm font-bold">{allIssues.length}</span>
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
