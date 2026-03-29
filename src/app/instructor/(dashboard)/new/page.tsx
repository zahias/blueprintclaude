"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TopicBuilder from "@/components/TopicBuilder";
import QADashboard from "@/components/QADashboard";
import { SEMESTERS, getAcademicYears } from "@/lib/constants";
import { type BlueprintTopicEntry, getSubmitIssues } from "@/lib/types";

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

type Step = "major" | "course" | "metadata" | "builder" | "done";

export default function InstructorNewBlueprintPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("major");
  const [majors, setMajors] = useState<Major[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [los, setLos] = useState<LO[]>([]);

  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [duration, setDuration] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [topicEntries, setTopicEntries] = useState<BlueprintTopicEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showMobileQA, setShowMobileQA] = useState(false);
  const dirtyRef = useRef(false);

  const academicYears = getAcademicYears();

  // Fetch instructor info
  useEffect(() => {
    fetch("/api/instructor/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/instructor/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.instructor) setInstructorName(data.instructor.name);
      });
  }, [router]);

  // Load majors on mount
  useEffect(() => {
    fetch("/api/instructor/majors").then((r) => r.json()).then(setMajors);
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

  // Validation
  const examTotalCalc = parseFloat(totalMarks) || 0;
  const totalPointsCalc = topicEntries.reduce((s, te) => s + te.totalPoints, 0);
  const submitIssues = getSubmitIssues(topicEntries, topics, examTotalCalc);
  const canSubmit = submitIssues.length === 0;

  const handleSave = useCallback(async (status: "DRAFT" | "SUBMITTED") => {
    setSaving(true);
    try {
      const payload = {
        courseId: selectedCourseId,
        instructorName,
        title,
        examDate: examDate || null,
        duration: duration ? parseInt(duration) : null,
        totalMarks,
        semester: semester || null,
        academicYear: academicYear || null,
        topics: topicEntries,
        status,
      };

      let res;
      if (savedToken) {
        res = await fetch(`/api/blueprints/${savedToken}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/blueprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSavedToken(data.accessToken);
        dirtyRef.current = false;
        if (status === "SUBMITTED") {
          setStep("done");
        }
      }
    } finally {
      setSaving(false);
    }
  }, [selectedCourseId, instructorName, title, examDate, duration, totalMarks, semester, academicYear, topicEntries, savedToken]);

  // Auto-save every 30s when dirty (only after first manual save)
  useEffect(() => {
    if (!savedToken) return;
    const id = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        handleSave("DRAFT").then(() => {
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [savedToken, handleSave]);

  // ─── Done screen ────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-md text-center bg-white rounded-xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Blueprint Submitted!</h2>
          <p className="text-gray-500 mb-6">
            Your blueprint has been submitted for coordinator review. You can track its status from your dashboard.
          </p>
          <div className="flex gap-2 justify-center">
            {savedToken && (
              <button onClick={() => router.push(`/blueprint/${savedToken}`)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
                View Blueprint
              </button>
            )}
            <button onClick={() => router.push("/instructor")} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
              My Blueprints
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm mb-8">
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
            <span className={`text-xs hidden sm:inline ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {s === "major" ? "Major" : s === "course" ? "Course" : s === "metadata" ? "Details" : "Build"}
            </span>
            {i < 3 && <div className="w-6 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Major */}
      {step === "major" && (
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Select Major</h2>
          <p className="text-gray-500 mb-6">Choose the academic major for this exam blueprint.</p>
          {majors.length === 0 ? (
            <p className="text-gray-400">No majors assigned. Ask your coordinator or administrator to assign you to a major.</p>
          ) : (
            <div className="space-y-2">
              {majors.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMajorId(m.id); setStep("course"); }}
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
                  onClick={() => { setSelectedCourseId(c.id); setStep("metadata"); }}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Midterm Exam, Final Exam, Quiz 3"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select semester...</option>
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select year...</option>
                  {academicYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <div className="relative">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="90"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">min</span>
                </div>
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
                if (!title || !totalMarks) return;
                setStep("builder");
              }}
              disabled={!title || !totalMarks}
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              Continue to Topic Builder →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Topic Builder + QA Dashboard */}
      {step === "builder" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={() => setStep("metadata")} className="text-indigo-600 text-sm mb-1 hover:text-indigo-800">
                ← Back to Exam Details
              </button>
              <h2 className="text-xl font-bold text-gray-900">Build Your Blueprint</h2>
              <p className="text-sm text-gray-500">
                {title} • {totalMarks} marks
                {semester && academicYear && ` • ${semester} ${academicYear}`}
                {topics.length > 0 && ` • ${topics.length} topics available`}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`text-sm font-medium ${totalPointsCalc === examTotalCalc ? "text-green-600" : "text-amber-600"}`}>
                {totalPointsCalc} / {examTotalCalc} pts
              </span>
              {savedToken && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Draft saved</span>
              )}
              {autoSaved && <span className="text-xs text-gray-400">Auto-saved</span>}
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
            </div>
          </div>

          {/* Submit checklist */}
          {!canSubmit && topicEntries.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm font-medium text-amber-800 mb-2">Fix these issues to submit:</p>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-0.5">
                {submitIssues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </div>
          )}

          {/* Instructional banner — dismissible */}
          {showBanner && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-6 text-sm text-indigo-700 flex items-start gap-3">
              <div className="flex-1">
                <strong>How it works:</strong> Add topics from your course, set the number of questions and points for each,
                then distribute the questions across Bloom&apos;s taxonomy levels and question types.
                The QA dashboard on the right updates live to show your assessment&apos;s balance and coverage.
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-indigo-400 hover:text-indigo-700 transition shrink-0 mt-0.5"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TopicBuilder
                topics={topics}
                entries={topicEntries}
                onChange={(entries) => { setTopicEntries(entries); dirtyRef.current = true; }}
              />
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
      )}
    </div>
  );
}
