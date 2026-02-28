"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopicBuilder from "@/components/TopicBuilder";
import QADashboard from "@/components/QADashboard";
import HelpTooltip from "@/components/HelpTooltip";
import { SEMESTERS, getAcademicYears } from "@/lib/constants";
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
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState("");
  const [copied, setCopied] = useState(false);

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
        // Update existing draft
        res = await fetch(`/api/blueprints/${savedToken}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await fetch("/api/blueprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSavedToken(data.accessToken);
        setSavedStatus(status);
        if (status === "SUBMITTED") {
          setStep("done");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (savedToken) {
      navigator.clipboard.writeText(savedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ─── Done screen ────────────────────────────────────────────────

  if (step === "done" && savedToken) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-md text-center bg-white rounded-xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {savedStatus === "SUBMITTED" ? "Blueprint Submitted!" : "Draft Saved!"}
          </h2>
          <p className="text-gray-500 mb-4">
            {savedStatus === "SUBMITTED"
              ? "Your blueprint has been submitted for admin review."
              : "Your draft has been saved. You can continue editing from your dashboard."}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Access Token (for sharing):</p>
            <p className="font-mono text-xs text-gray-900 break-all select-all">{savedToken}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleCopy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
              {copied ? "Copied!" : "Copy Token"}
            </button>
            <button onClick={() => router.push(`/blueprint/${savedToken}`)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
              View Blueprint
            </button>
            <button onClick={() => router.push("/instructor")} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
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
            <p className="text-gray-400">No majors available. Ask your administrator to set them up.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Title
                <HelpTooltip text="A descriptive name for this exam, e.g. 'Midterm Exam', 'Final Exam', 'Quiz 3'." />
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Midterm Exam"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                  <HelpTooltip text="The academic semester when this exam will be administered." />
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year
                  <HelpTooltip text="The academic year for this exam, e.g. 2025/2026." />
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                  <HelpTooltip text="How many minutes students will have to complete this exam." />
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="90"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Marks
                  <HelpTooltip text="The maximum marks/points for this entire exam. The sum of all topic points should match this number." />
                </label>
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
              {savedToken && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    {savedStatus === "DRAFT" ? "Draft saved!" : "Saved!"}
                  </span>
                  <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-indigo-600" title="Copy access token">
                    {copied ? "Copied!" : "📋"}
                  </button>
                </div>
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

          {/* Instructional banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-6 text-sm text-indigo-700">
            <strong>How it works:</strong> Add topics from your course, set the number of questions and points for each,
            then distribute the questions across Bloom&apos;s taxonomy levels and question types.
            The QA dashboard on the right updates live to show your assessment&apos;s balance and coverage.
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
  );
}
