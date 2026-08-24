"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BlueprintBloomMatrix from "@/components/BlueprintBloomMatrix";
import BlueprintQuestionReview from "@/components/BlueprintQuestionReview";
import BlueprintQuestionFormatMatrix from "@/components/BlueprintQuestionFormatMatrix";
import BlueprintTopicSelector from "@/components/BlueprintTopicSelector";
import {
  type BlueprintQuestionFormatEntry,
  type BlueprintTopicEntry,
  getQuestionFormatIssues,
  getSubmitIssues,
} from "@/lib/types";

interface ActiveTerm {
  id: string;
  semester: string;
  academicYear: string;
  isActive?: boolean;
}

interface AssignedCourse {
  id: string;
  code: string;
  name: string;
  editable: boolean;
  activeOfferingId: string | null;
  major?: { id: string; name: string };
  term?: ActiveTerm | null;
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

type Step = "details" | "topics" | "matrix" | "formats" | "review" | "done";

const EXAM_TYPES = ["Midterm", "Final", "Major Exam"] as const;

async function readJson<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text();
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function InstructorNewBlueprintBuilder() {
  const router = useRouter();
  const dirtyRef = useRef(false);

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTerm, setActiveTerm] = useState<ActiveTerm | null>(null);
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [los, setLos] = useState<LO[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [examType, setExamType] = useState("");
  const [totalQuestions, setTotalQuestions] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [topicEntries, setTopicEntries] = useState<BlueprintTopicEntry[]>([]);
  const [questionFormats, setQuestionFormats] = useState<BlueprintQuestionFormatEntry[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState("");
  const [autoSaved, setAutoSaved] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setLoadError("");
      const [meRes, termRes, courseRes] = await Promise.all([
        fetch("/api/instructor/me"),
        fetch("/api/terms/active"),
        fetch("/api/instructor/courses"),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const [meData, termData, courseData] = await Promise.all([
        readJson<{ instructor?: { name: string } }>(meRes, {}),
        readJson<ActiveTerm | null>(termRes, null),
        readJson<AssignedCourse[]>(courseRes, []),
      ]);

      if (meData.instructor?.name) setInstructorName(meData.instructor.name);
      setActiveTerm(termData?.id ? termData : null);
      setCourses(Array.isArray(courseData) ? courseData : []);
      if (termData?.id) {
        setSemester(termData.semester);
        setAcademicYear(termData.academicYear);
      }
      setLoading(false);
    }

    loadInitialData().catch(() => {
      setLoadError("Could not load your active-term setup.");
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!selectedCourseId || !semester || !academicYear) {
      setTopics([]);
      setLos([]);
      return;
    }

    const params = new URLSearchParams({ semester, academicYear });
    fetch(`/api/courses/${selectedCourseId}?${params.toString()}`)
      .then((res) => readJson<{ topics?: TopicData[]; los?: LO[]; syllabi?: { semester: string; academicYear: string }[] }>(res, {}))
      .then((course) => {
        const nextTopics = course.topics || [];
        setTopics(nextTopics);
        setLos(course.los || []);
        setTopicEntries((entries) => entries.filter((entry) => nextTopics.some((topic) => topic.id === entry.topicId)));
      })
      .catch(() => {
        setTopics([]);
        setLos([]);
      });
  }, [selectedCourseId, semester, academicYear]);

  const activeCourses = courses.filter((course) => course.editable && course.term?.id === activeTerm?.id);
  const selectedCourse = activeCourses.find((course) => course.id === selectedCourseId);
  const totalQuestionsExpected = parseInt(totalQuestions) || 0;
  const matrixQuestionTotal = topicEntries.reduce((sum, entry) => sum + entry.questionCount, 0);
  const submitIssues = getSubmitIssues(topicEntries, topics, totalQuestionsExpected);
  const questionFormatIssues = getQuestionFormatIssues(questionFormats, totalQuestionsExpected, true);
  const allSubmitIssues = [...submitIssues, ...questionFormatIssues];
  const canSubmit = allSubmitIssues.length === 0;
  const canContinueDetails = Boolean(activeTerm && selectedCourseId && examType && totalQuestionsExpected > 0);

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

  function updateEntries(entries: BlueprintTopicEntry[]) {
    setTopicEntries(entries);
    dirtyRef.current = true;
  }

  function updateQuestionFormats(formats: BlueprintQuestionFormatEntry[]) {
    setQuestionFormats(formats);
    dirtyRef.current = true;
  }

  const handleSave = useCallback(async (status: "DRAFT" | "SUBMITTED") => {
    setSaving(true);
    setSaveError("");
    try {
      const normalizedEntries = topicEntries.map((entry) => ({
        ...entry,
        totalPoints: entry.questionCount,
      }));
      const payload = {
        courseId: selectedCourseId,
        instructorName,
        title: examType,
        examDate: null,
        duration: null,
        totalMarks: totalQuestions,
        semester: semester || null,
        academicYear: academicYear || null,
        topics: normalizedEntries,
        questionFormats,
        status,
      };

      const res = await fetch(savedToken ? `/api/blueprints/${savedToken}` : "/api/blueprints", {
        method: savedToken ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ accessToken?: string; error?: string; issues?: string[] }>(res, {});

      if (!res.ok) {
        setSaveError(data.issues?.join(" ") || data.error || "Could not save blueprint.");
        return;
      }

      if (data.accessToken) setSavedToken(data.accessToken);
      dirtyRef.current = false;
      if (status === "SUBMITTED") setStep("done");
    } finally {
      setSaving(false);
    }
  }, [selectedCourseId, instructorName, examType, totalQuestions, semester, academicYear, topicEntries, questionFormats, savedToken]);

  useEffect(() => {
    if (!savedToken) return;
    const timer = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        handleSave("DRAFT").then(() => {
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        });
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [savedToken, handleSave]);

  if (loading) return <div className="text-gray-500">Loading blueprint setup...</div>;

  if (step === "done") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-600">✓</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Blueprint Submitted</h2>
          <p className="mb-6 text-gray-500">Your blueprint has been submitted for coordinator review.</p>
          <div className="flex justify-center gap-2">
            {savedToken && (
              <button onClick={() => router.push(`/blueprint/${savedToken}`)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                View Blueprint
              </button>
            )}
            <button onClick={() => router.push("/instructor")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
              My Blueprints
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps: { id: Step; label: string }[] = [
    { id: "details", label: "Exam Details" },
    { id: "topics", label: "Select Topics" },
    { id: "matrix", label: "Bloom Matrix" },
    { id: "formats", label: "Question Formats" },
    { id: "review", label: "Review" },
  ];
  const currentStepIndex = steps.findIndex((item) => item.id === step);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
        {steps.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step === item.id ? "bg-indigo-600 text-white" : index < currentStepIndex ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {index + 1}
            </span>
            <span className={step === item.id ? "font-medium text-gray-900" : "text-gray-400"}>{item.label}</span>
            {index < steps.length - 1 && <div className="h-px w-5 bg-gray-300" />}
          </div>
        ))}
      </div>

      {loadError && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
      {saveError && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>}

      {!activeTerm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <h2 className="font-semibold">No active term</h2>
          <p className="mt-1 text-sm">The coordinator must create and activate a term before instructors can create blueprints.</p>
        </div>
      )}

      {activeTerm && step === "details" && (
        <section className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">Exam Details</h2>
          <p className="mt-1 text-sm text-gray-500">Select one active assigned course and enter the basic exam information.</p>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <label className="text-sm font-medium text-gray-700">
              Active Term
              <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {activeTerm.semester} {activeTerm.academicYear}
              </div>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Course
              <select
                value={selectedCourseId}
                onChange={(event) => {
                  setSelectedCourseId(event.target.value);
                  setTopicEntries([]);
                  dirtyRef.current = true;
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select active assigned course...</option>
                {activeCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}{course.major?.name ? ` (${course.major.name})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {activeCourses.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No active course assignments were found. Ask the coordinator to create active-term course offerings and assign you.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Exam Type
                <select
                  value={examType}
                  onChange={(event) => setExamType(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select exam type...</option>
                  {EXAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Total Questions
                <input
                  type="number"
                  min={1}
                  value={totalQuestions}
                  onChange={(event) => setTotalQuestions(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="50"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setStep("topics")}
              disabled={!canContinueDetails}
              className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Topics
            </button>
          </div>
        </section>
      )}

      {activeTerm && step === "topics" && (
        <div className="space-y-5">
          <div>
            <button onClick={() => setStep("details")} className="mb-2 text-sm text-indigo-600 hover:text-indigo-800">Back to Exam Details</button>
            <h2 className="text-xl font-bold text-gray-900">Select Topics</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCourse?.code} {selectedCourse?.name} • {semester} {academicYear}
            </p>
          </div>
          <BlueprintTopicSelector topics={topics} entries={topicEntries} onChange={updateEntries} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("details")} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button
              onClick={() => setStep("matrix")}
              disabled={topicEntries.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Bloom Matrix
            </button>
          </div>
        </div>
      )}

      {activeTerm && step === "matrix" && (
        <div className="space-y-5">
          <div>
            <button onClick={() => setStep("topics")} className="mb-2 text-sm text-indigo-600 hover:text-indigo-800">Back to Topics</button>
            <h2 className="text-xl font-bold text-gray-900">Bloom Matrix</h2>
            <p className="mt-1 text-sm text-gray-500">Fill the number of questions for each topic and Bloom level.</p>
          </div>
          <BlueprintBloomMatrix topics={topics} entries={topicEntries} onChange={updateEntries} />
          {!canSubmit && topicEntries.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-sm font-medium text-amber-800">Current issues</p>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-amber-700">
                {submitIssues.map((issue, index) => <li key={index}>{issue}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className={`rounded-full px-3 py-2 text-sm font-semibold ${matrixQuestionTotal === totalQuestionsExpected ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              {matrixQuestionTotal} / {totalQuestionsExpected} questions
            </span>
            <div className="flex gap-2">
              <button onClick={() => setStep("topics")} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
              <button onClick={() => setStep("formats")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Continue to Question Formats
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTerm && step === "formats" && (
        <div className="space-y-5">
          <div>
            <button onClick={() => setStep("matrix")} className="mb-2 text-sm text-indigo-600 hover:text-indigo-800">Back to Bloom Matrix</button>
            <h2 className="text-xl font-bold text-gray-900">Question Formats</h2>
            <p className="mt-1 text-sm text-gray-500">Record closed-ended and open-ended question types so the review can flag imbalance.</p>
          </div>
          <BlueprintQuestionFormatMatrix
            formats={questionFormats}
            totalQuestionsExpected={totalQuestionsExpected}
            onChange={updateQuestionFormats}
          />
          {questionFormatIssues.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-sm font-medium text-amber-800">Current issues</p>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-amber-700">
                {questionFormatIssues.map((issue, index) => <li key={index}>{issue}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("matrix")} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={() => setStep("review")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Review Blueprint
            </button>
          </div>
        </div>
      )}

      {activeTerm && step === "review" && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <button onClick={() => setStep("formats")} className="mb-2 text-sm text-indigo-600 hover:text-indigo-800">Back to Question Formats</button>
              <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
              <p className="mt-1 text-sm text-gray-500">{examType} • {selectedCourse?.code} • {semester} {academicYear}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving || topicEntries.length === 0}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave("SUBMITTED")}
                disabled={saving || !canSubmit}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                title={!canSubmit ? "Resolve all issues before submitting" : ""}
              >
                {saving ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>

          {autoSaved && <div className="text-sm text-green-700">Draft auto-saved.</div>}
          <BlueprintQuestionReview
            examType={examType}
            courseLabel={selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : ""}
            termLabel={`${semester} ${academicYear}`}
            totalQuestionsExpected={totalQuestionsExpected}
            courseLOs={los}
            topics={reviewTopics}
            questionFormats={questionFormats}
            issues={allSubmitIssues}
          />
        </div>
      )}
    </div>
  );
}
