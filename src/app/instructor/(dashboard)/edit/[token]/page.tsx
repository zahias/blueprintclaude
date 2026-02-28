"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import TopicBuilder from "@/components/TopicBuilder";
import QADashboard from "@/components/QADashboard";
import HelpTooltip from "@/components/HelpTooltip";
import { SEMESTERS, getAcademicYears, BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";
import type { BlueprintTopicEntry } from "@/lib/types";

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
  const [copied, setCopied] = useState(false);

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

  async function handleSave(newStatus: "DRAFT" | "SUBMITTED") {
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
  }

  function handleCopy() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="text-gray-500">Loading blueprint...</div>;

  const canEdit = status === "DRAFT" || status === "REJECTED";

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
          <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-indigo-600" title="Copy access token">
            {copied ? "Copied!" : "📋 Token"}
          </button>
          {saved && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Saved!</span>}
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
                disabled={saving || topicEntries.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700">
          This blueprint is currently <strong>{status.toLowerCase()}</strong> and cannot be edited.
        </div>
      )}

      {/* Metadata row */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title <HelpTooltip text="A descriptive name for this exam." />
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
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
              onChange={(e) => setAcademicYear(e.target.value)}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            >
              <option value="">—</option>
              {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Total Marks <HelpTooltip text="The maximum marks/points for this entire exam." />
            </label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {canEdit ? (
            <TopicBuilder topics={topics} entries={topicEntries} onChange={setTopicEntries} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-500 text-sm">
              Topic editing is disabled for {status.toLowerCase()} blueprints.
            </div>
          )}
        </div>
        <div className="xl:col-span-1">
          <div className="sticky top-20">
            <QADashboard blueprint={blueprintForQA} />
          </div>
        </div>
      </div>
    </div>
  );
}
