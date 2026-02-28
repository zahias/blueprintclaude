"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopicBuilder from "@/components/TopicBuilder";
import QADashboard from "@/components/QADashboard";
import { BLOOM_LEVELS } from "@/lib/constants";
import type { BlueprintTopicEntry } from "@/lib/types";

interface Major {
  id: string;
  name: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
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

type Step = "major" | "course" | "metadata" | "builder" | "review";

export default function NewBlueprintPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("major");
  const [majors, setMajors] = useState<Major[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [los, setLos] = useState<LO[]>([]);

  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [instructorName, setInstructorName] = useState("");
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [duration, setDuration] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  const [topicEntries, setTopicEntries] = useState<BlueprintTopicEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedToken, setSavedToken] = useState<string | null>(null);

  // Load majors on mount
  useEffect(() => {
    fetch("/api/majors").then((r) => r.json()).then(setMajors);
  }, []);

  // Load courses when major selected
  useEffect(() => {
    if (!selectedMajorId) return;
    fetch(`/api/courses?majorId=${selectedMajorId}`).then((r) => r.json()).then(setCourses);
  }, [selectedMajorId]);

  // Load topics & LOs when course selected
  useEffect(() => {
    if (!selectedCourseId) return;
    Promise.all([
      fetch(`/api/courses/${selectedCourseId}/topics`).then((r) => r.json()),
      fetch(`/api/courses/${selectedCourseId}/los`).then((r) => r.json()),
    ]).then(([t, l]) => {
      setTopics(t);
      setLos(l);
    });
  }, [selectedCourseId]);

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

  async function handleSave(status: "DRAFT" | "SUBMITTED") {
    setSaving(true);
    try {
      const res = await fetch("/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          instructorName,
          title,
          examDate: examDate || null,
          duration: duration ? parseInt(duration) : null,
          totalMarks,
          topics: topicEntries,
          status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedToken(data.accessToken);
        if (status === "SUBMITTED") {
          setStep("review");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  // ─── Step renderers ────────────────────────────────────────────────

  if (savedToken && step === "review") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center bg-white rounded-xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Blueprint Submitted!</h2>
          <p className="text-gray-500 mb-4">Your blueprint has been submitted for review.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Your access token (save this!):</p>
            <p className="font-mono text-sm text-gray-900 break-all select-all">{savedToken}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                navigator.clipboard.writeText(savedToken);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
            >
              Copy Token
            </button>
            <button
              onClick={() => router.push(`/blueprint/${savedToken}`)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              View Blueprint
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="font-bold text-gray-900">New Blueprint</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {(["major", "course", "metadata", "builder"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s
                      ? "bg-indigo-600 text-white"
                      : (["major", "course", "metadata", "builder"].indexOf(step) > i)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
                {i < 3 && <div className="w-8 h-px bg-gray-300" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Step 1: Select Major */}
        {step === "major" && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select Major</h2>
            <p className="text-gray-500 mb-6">Choose the academic major for this exam blueprint.</p>
            {majors.length === 0 ? (
              <p className="text-gray-400">No majors available. Ask an admin to set them up.</p>
            ) : (
              <div className="space-y-2">
                {majors.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMajorId(m.id);
                      setStep("course");
                    }}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition"
                  >
                    <p className="font-medium text-gray-900">{m.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Course */}
        {step === "course" && (
          <div className="max-w-lg mx-auto">
            <button onClick={() => setStep("major")} className="text-indigo-600 text-sm mb-4 hover:text-indigo-800">
              ← Change Major
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select Course</h2>
            <p className="text-gray-500 mb-6">
              Major: <span className="font-medium text-gray-700">{majors.find((m) => m.id === selectedMajorId)?.name}</span>
            </p>
            {courses.length === 0 ? (
              <p className="text-gray-400">No courses under this major.</p>
            ) : (
              <div className="space-y-2">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCourseId(c.id);
                      setStep("metadata");
                    }}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition"
                  >
                    <p className="font-mono text-xs text-indigo-600 mb-0.5">{c.code}</p>
                    <p className="font-medium text-gray-900">{c.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Exam Metadata */}
        {step === "metadata" && (
          <div className="max-w-lg mx-auto">
            <button onClick={() => setStep("course")} className="text-indigo-600 text-sm mb-4 hover:text-indigo-800">
              ← Change Course
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Exam Details</h2>
            <p className="text-gray-500 mb-6">Basic information about this assessment.</p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (Instructor)</label>
                <input
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Dr. Jane Smith"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Midterm Exam"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="100"
                    required
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!instructorName || !title || !totalMarks) return;
                  setStep("builder");
                }}
                disabled={!instructorName || !title || !totalMarks}
                className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Continue to Topic Builder
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Topic Builder + QA Dashboard */}
        {step === "builder" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <button onClick={() => setStep("metadata")} className="text-indigo-600 text-sm mb-1 hover:text-indigo-800">
                  ← Back to Exam Details
                </button>
                <h2 className="text-xl font-bold text-gray-900">Build Your Blueprint</h2>
                <p className="text-sm text-gray-500">
                  {title} • {totalMarks} marks
                  {topics.length > 0 && ` • ${topics.length} topics available`}
                </p>
              </div>
              <div className="flex gap-2">
                {savedToken && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Draft saved!</span>
                )}
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
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Topic builder — takes 2/3 */}
              <div className="xl:col-span-2">
                <TopicBuilder
                  topics={topics}
                  entries={topicEntries}
                  onChange={setTopicEntries}
                />
              </div>

              {/* QA Dashboard — takes 1/3 */}
              <div className="xl:col-span-1">
                <div className="sticky top-20">
                  <QADashboard blueprint={blueprintForQA} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
