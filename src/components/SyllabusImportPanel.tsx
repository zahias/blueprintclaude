"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Major {
  id: string;
  name: string;
}

interface CourseOption {
  id: string;
  majorId: string;
  code: string;
  name: string;
  major: { name: string };
}

interface DraftLO {
  code: string;
  description: string;
}

interface DraftTopic {
  week: string;
  name: string;
  loCodes: string[];
  assessment: string | null;
  sortOrder: number;
}

interface DraftSyllabus {
  fileName: string;
  courseCode: string;
  courseName: string;
  learningOutcomes: DraftLO[];
  topics: DraftTopic[];
  warnings: string[];
  matchedCourseId: string | null;
  matchedMajorId: string | null;
  matchStatus: string;
}

interface ParseResponse {
  syllabi: DraftSyllabus[];
  courses: CourseOption[];
  majors: Major[];
  courseSyllabi: CourseSyllabusOption[];
}

interface ImportResult {
  courses: { created: number; updated: number };
  syllabi: { created: number; replaced: number };
  learningOutcomes: { created: number; updated: number };
  topics: { created: number; updated: number };
  links: { replaced: number };
  errors: string[];
  items?: {
    fileName: string | null;
    courseCode: string;
    courseId: string | null;
    syllabusId: string | null;
    status: "created" | "replaced" | "skipped";
    learningOutcomes: number;
    topics: number;
    links: number;
    errors: string[];
  }[];
}

interface CourseSyllabusOption {
  id: string;
  courseId: string;
  semester: string;
  academicYear: string;
  isCurrent: boolean;
}

interface ActiveTerm {
  id: string;
  semester: string;
  academicYear: string;
  isActive?: boolean;
  _count?: { offerings: number };
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function StatusChip({ label, tone }: { label: string; tone: "green" | "amber" | "red" | "gray" | "blue" }) {
  const classes = {
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  }[tone];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>{label}</span>;
}

async function readJson<T>(res: Response, fallback: T): Promise<T & { error?: string; setupRequired?: boolean }> {
  const text = await res.text();
  if (!text) return fallback as T & { error?: string; setupRequired?: boolean };
  try {
    return JSON.parse(text);
  } catch {
    return { ...(fallback as object), error: `Request failed with a non-JSON response (${res.status}).` } as T & { error?: string; setupRequired?: boolean };
  }
}

interface SyllabusImportPanelProps {
  embedded?: boolean;
  fixedTermId?: string;
  onImported?: () => void;
}

export function SyllabusImportPanel({ embedded = false, fixedTermId = "", onImported }: SyllabusImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [drafts, setDrafts] = useState<DraftSyllabus[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [courseSyllabi, setCourseSyllabi] = useState<CourseSyllabusOption[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Record<number, string>>({});
  const [selectedMajorIds, setSelectedMajorIds] = useState<Record<number, string>>({});
  const [terms, setTerms] = useState<ActiveTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [activeTerm, setActiveTerm] = useState<ActiveTerm | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const effectiveTermId = fixedTermId || selectedTermId;
  const selectedTerm = terms.find((term) => term.id === effectiveTermId) || activeTerm;

  useEffect(() => {
    async function loadTerms() {
      const [activeRes, termsRes] = await Promise.all([
        fetch("/api/terms/active"),
        fetch("/api/coordinator/terms"),
      ]);
      const [activeData, termsData] = await Promise.all([
        readJson<ActiveTerm | null>(activeRes, null),
        readJson<ActiveTerm[] | { error?: string; setupRequired?: boolean }>(termsRes, []),
      ]);

      if (!termsRes.ok && !Array.isArray(termsData)) {
        setError(termsData.error || "Could not load created terms.");
        return;
      }

      const createdTerms = Array.isArray(termsData) ? termsData : [];
      const active = activeData?.id ? activeData : createdTerms.find((term) => term.isActive) || null;
      setTerms(createdTerms);
      setActiveTerm(active);
      if (active && !fixedTermId) {
        setSelectedTermId(active.id);
        setSemester(active.semester);
        setAcademicYear(active.academicYear);
      }
    }
    loadTerms().catch(() => setError("Could not load created terms."));
  }, [fixedTermId]);

  useEffect(() => {
    if (fixedTermId) {
      setSelectedTermId(fixedTermId);
    }
  }, [fixedTermId]);

  useEffect(() => {
    if (!selectedTerm) {
      setSemester("");
      setAcademicYear("");
      return;
    }
    setSemester(selectedTerm.semester);
    setAcademicYear(selectedTerm.academicYear);
  }, [selectedTerm]);

  async function parseFiles() {
    if (files.length === 0) return;
    setParsing(true);
    setError("");
    setImportNotice("");
    setResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("termId", effectiveTermId);
    try {
      const res = await fetch("/api/coordinator/syllabus/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to parse syllabus files.");
        return;
      }

      const parsed = data as ParseResponse;
      setDrafts(parsed.syllabi);
      setCourses(parsed.courses);
      setMajors(parsed.majors);
      setCourseSyllabi(parsed.courseSyllabi || []);
      setSelectedCourseIds(Object.fromEntries(parsed.syllabi.map((draft, index) => [index, draft.matchedCourseId || ""])));
      setSelectedMajorIds(Object.fromEntries(parsed.syllabi.map((draft, index) => [index, draft.matchedMajorId || ""])));
    } catch {
      setError("Network error while parsing syllabus files.");
    } finally {
      setParsing(false);
    }
  }

  function updateDraft(index: number, next: Partial<DraftSyllabus>) {
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...next } : draft)));
  }

  function updateLO(draftIndex: number, loIndex: number, next: Partial<DraftLO>) {
    setDrafts((current) =>
      current.map((draft, i) =>
        i === draftIndex
          ? {
              ...draft,
              learningOutcomes: draft.learningOutcomes.map((lo, j) => (j === loIndex ? { ...lo, ...next } : lo)),
            }
          : draft
      )
    );
  }

  function updateTopic(draftIndex: number, topicIndex: number, next: Partial<DraftTopic>) {
    setDrafts((current) =>
      current.map((draft, i) =>
        i === draftIndex
          ? {
              ...draft,
              topics: draft.topics.map((topic, j) => (j === topicIndex ? { ...topic, ...next } : topic)),
            }
          : draft
      )
    );
  }

  function toggleTopicLO(draftIndex: number, topicIndex: number, loCode: string) {
    const topic = drafts[draftIndex].topics[topicIndex];
    const code = normalizeCode(loCode);
    const nextCodes = topic.loCodes.includes(code) ? topic.loCodes.filter((item) => item !== code) : [...topic.loCodes, code];
    updateTopic(draftIndex, topicIndex, { loCodes: nextCodes });
  }

  function addLO(draftIndex: number) {
    const draft = drafts[draftIndex];
    updateDraft(draftIndex, {
      learningOutcomes: [...draft.learningOutcomes, { code: `CLO${draft.learningOutcomes.length + 1}`, description: "" }],
    });
  }

  function removeLO(draftIndex: number, loIndex: number) {
    const draft = drafts[draftIndex];
    const code = draft.learningOutcomes[loIndex].code;
    updateDraft(draftIndex, {
      learningOutcomes: draft.learningOutcomes.filter((_, index) => index !== loIndex),
      topics: draft.topics.map((topic) => ({ ...topic, loCodes: topic.loCodes.filter((loCode) => loCode !== code) })),
    });
  }

  function removeTopic(draftIndex: number, topicIndex: number) {
    const draft = drafts[draftIndex];
    updateDraft(draftIndex, { topics: draft.topics.filter((_, index) => index !== topicIndex) });
  }

  function getDraftMeta(draft: DraftSyllabus, index: number) {
    const selectedCourseId = selectedCourseIds[index] || "";
    const selectedCourse = courses.find((course) => course.id === selectedCourseId);
    const selectedMajorId = selectedCourse?.majorId || selectedMajorIds[index] || "";
    const matchingVersion = selectedCourseId && selectedTerm
      ? courseSyllabi.find((item) => item.courseId === selectedCourseId && item.semester === selectedTerm.semester && item.academicYear === selectedTerm.academicYear)
      : null;
    const issues = [
      !selectedCourseId ? "Select an active offering created from the progress report." : "",
      !normalizeCode(draft.courseCode) ? "Add a course code." : "",
      !draft.courseName.trim() ? "Add a course name." : "",
      !effectiveTermId ? "Select a created term." : "",
      draft.learningOutcomes.length === 0 ? "At least one CLO is required." : "",
      draft.topics.length === 0 ? "At least one topic is required." : "",
      draft.matchStatus === "unsupported" ? "Unsupported file type." : "",
      draft.matchStatus === "unmatched" ? "This course is not in the active term offerings. Import the progress report first or check the course code." : "",
    ].filter(Boolean);
    return { selectedCourseId, selectedCourse, selectedMajorId, matchingVersion, issues, valid: issues.length === 0 };
  }

  function getValidDrafts() {
    return validatedDrafts().filter((draft, index) => getDraftMeta(drafts[index], index).valid);
  }

  function validatedDrafts() {
    return drafts.map((draft, index) => {
      const selectedCourseId = selectedCourseIds[index] || null;
      const selectedCourse = courses.find((course) => course.id === selectedCourseId);
      return {
        ...draft,
        courseId: selectedCourseId,
        majorId: selectedCourse?.majorId || selectedMajorIds[index],
        courseCode: normalizeCode(draft.courseCode),
        semester: selectedTerm?.semester || "",
        academicYear: selectedTerm?.academicYear || "",
        fileName: draft.fileName,
        learningOutcomes: draft.learningOutcomes.map((lo) => ({ ...lo, code: normalizeCode(lo.code), description: lo.description.trim() })),
        topics: draft.topics.map((topic, topicIndex) => ({
          ...topic,
          name: topic.name.trim(),
          loCodes: [...new Set(topic.loCodes.map(normalizeCode).filter(Boolean))],
          sortOrder: topic.sortOrder || topicIndex + 1,
        })),
      };
    });
  }

  async function importDrafts() {
    const validDrafts = getValidDrafts();
    if (validDrafts.length === 0) {
      setError("No valid syllabi are ready to import. Fix at least one reviewed syllabus first.");
      return;
    }

    setImporting(true);
    setError("");
    setImportNotice("");
    setResult(null);
    try {
      const res = await fetch("/api/coordinator/syllabus/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabi: validDrafts, termId: effectiveTermId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to import reviewed syllabi.");
        return;
      }
      setResult(data);
      const importedCount = data.syllabi.created + data.syllabi.replaced;
      const skippedCount = data.items?.filter((item: NonNullable<ImportResult["items"]>[number]) => item.status === "skipped").length || 0;
      setImportNotice(
        importedCount > 0
          ? `Import complete: ${importedCount} syllabus version${importedCount === 1 ? "" : "s"} imported, ${skippedCount} skipped.`
          : `Import finished, but no syllabus versions were imported. ${skippedCount} skipped.`
      );
      onImported?.();
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setError("Network error while importing syllabi.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Syllabus Import</h1>
          <p className="text-sm text-gray-600 mt-1">
            Select a created term, upload Word syllabi, review extracted CLOs and topics, then import all valid files together.
          </p>
          {activeTerm && (
            <p className="text-xs text-teal-700 mt-2">
              Active term: {activeTerm.semester} {activeTerm.academicYear}
            </p>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 mb-5">
          <label className="text-sm font-medium text-gray-700">
            Import Term
            <select
              value={effectiveTermId}
              disabled={Boolean(fixedTermId)}
              onChange={(event) => {
                setSelectedTermId(event.target.value);
                setResult(null);
                setImportNotice("");
              }}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
            >
              <option value="">Select a created term...</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.semester} {term.academicYear}{term.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          </label>
          {terms.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Create a term in <Link href="/coordinator/term-setup" className="font-semibold underline">Term Setup</Link> before importing syllabi.
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".docx"
            onChange={(event) => {
              setFiles(Array.from(event.target.files || []));
              setDrafts([]);
              setResult(null);
              setImportNotice("");
              setError("");
            }}
            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
          <button
            onClick={parseFiles}
            disabled={files.length === 0 || parsing || !effectiveTermId}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {parsing ? "Parsing..." : "Parse Syllabi"}
          </button>
        </div>
        {files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {files.map((file) => <span key={`${file.name}-${file.size}`} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{file.name}</span>)}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">DOCX is supported in this version. Review each file before importing.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm font-medium">{error}</div>}
      {importNotice && (
        <div className={`rounded-xl border p-4 mb-6 text-sm font-medium ${
          result && result.syllabi.created + result.syllabi.replaced > 0
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {importNotice}
        </div>
      )}

      {result && (
        <div ref={resultRef} tabIndex={-1} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 outline-none focus:ring-2 focus:ring-teal-500">
          <h2 className="font-semibold text-gray-900 mb-3">Import Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-teal-50 rounded-lg p-3"><strong>{result.courses.created + result.courses.updated}</strong> courses</div>
            <div className="bg-indigo-50 rounded-lg p-3"><strong>{result.syllabi.created + result.syllabi.replaced}</strong> syllabus versions</div>
            <div className="bg-emerald-50 rounded-lg p-3"><strong>{result.learningOutcomes.created + result.learningOutcomes.updated}</strong> CLOs</div>
            <div className="bg-cyan-50 rounded-lg p-3"><strong>{result.topics.created + result.topics.updated}</strong> topics</div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              {result.errors.map((item, index) => <p key={index}>{item}</p>)}
            </div>
          )}
          {result.syllabi.created + result.syllabi.replaced === 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              No syllabus versions were imported. Review skipped rows and errors below.
            </div>
          )}
          {result.items && result.items.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">File</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Course</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Result</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Imported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {result.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-gray-700">{item.fileName || "Reviewed syllabus"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.courseCode || "-"}</td>
                      <td className="px-3 py-2">
                        <StatusChip label={item.status === "created" ? "Created" : item.status === "replaced" ? "Replaced" : "Skipped"} tone={item.status === "skipped" ? "red" : "green"} />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.learningOutcomes} CLOs, {item.topics} topics, {item.links} links</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {drafts.length > 0 && (() => {
        const metas = drafts.map((draft, index) => getDraftMeta(draft, index));
        const validCount = metas.filter((meta) => meta.valid).length;
        const matchedCount = drafts.filter((draft) => draft.matchStatus === "matched").length;
        const needsSelectionCount = metas.filter((meta) => !meta.selectedCourseId && !meta.selectedMajorId).length;
        const replaceCount = metas.filter((meta) => meta.valid && meta.matchingVersion).length;
        const createCount = metas.filter((meta) => meta.valid && !meta.matchingVersion).length;
        const warningCount = drafts.filter((draft) => draft.warnings.length > 0).length + metas.filter((meta) => !meta.valid).length;
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Batch Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3"><strong>{drafts.length}</strong><p className="text-xs text-gray-500">files</p></div>
              <div className="rounded-lg bg-green-50 p-3"><strong>{matchedCount}</strong><p className="text-xs text-green-700">matched</p></div>
              <div className="rounded-lg bg-amber-50 p-3"><strong>{needsSelectionCount}</strong><p className="text-xs text-amber-700">need selection</p></div>
              <div className="rounded-lg bg-blue-50 p-3"><strong>{createCount}</strong><p className="text-xs text-blue-700">create</p></div>
              <div className="rounded-lg bg-indigo-50 p-3"><strong>{replaceCount}</strong><p className="text-xs text-indigo-700">replace</p></div>
              <div className="rounded-lg bg-red-50 p-3"><strong>{warningCount}</strong><p className="text-xs text-red-700">warnings</p></div>
            </div>
            <p className="mt-3 text-xs text-gray-500">{validCount} of {drafts.length} reviewed syllabi are ready to import.</p>
          </div>
        );
      })()}

      <div className="space-y-6">
        {drafts.map((draft, draftIndex) => {
          const { selectedCourseId, selectedCourse, selectedMajorId, matchingVersion, issues, valid } = getDraftMeta(draft, draftIndex);

          return (
            <details key={`${draft.fileName}-${draftIndex}`} className="group bg-white border border-gray-200 rounded-xl" open={draftIndex === 0}>
              <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{draft.fileName}</p>
                  <h2 className="text-lg font-semibold text-gray-900">{draft.courseCode || "Course code needed"}</h2>
                  <p className="mt-1 text-sm text-gray-500">{draft.learningOutcomes.length} CLOs, {draft.topics.length} topics</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip label={draft.matchStatus === "matched" ? "Matched" : draft.matchStatus === "unsupported" ? "Unsupported file" : "Needs course selection"} tone={draft.matchStatus === "matched" ? "green" : draft.matchStatus === "unsupported" ? "red" : "amber"} />
                  <StatusChip label={valid ? "Ready to import" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`} tone={valid ? "blue" : "amber"} />
                  <span className="text-xs font-medium text-gray-400 group-open:hidden">Open review</span>
                  <span className="hidden text-xs font-medium text-gray-400 group-open:inline">Hide review</span>
                </div>
              </summary>
              <div className="border-t border-gray-100 p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{draft.fileName}</p>
                  <h2 className="text-lg font-semibold text-gray-900">{draft.courseCode || "Course code needed"}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusChip label={draft.matchStatus === "matched" ? "Matched" : draft.matchStatus === "unsupported" ? "Unsupported file" : "Needs course selection"} tone={draft.matchStatus === "matched" ? "green" : draft.matchStatus === "unsupported" ? "red" : "amber"} />
                    <StatusChip label={valid ? "Ready to import" : "Needs fixes"} tone={valid ? "blue" : "amber"} />
                    {selectedTerm && (
                      <StatusChip
                        label={matchingVersion ? `Will replace ${selectedTerm.semester} ${selectedTerm.academicYear}` : `Will create ${selectedTerm.semester} ${selectedTerm.academicYear}`}
                        tone={matchingVersion ? "amber" : "green"}
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:w-[560px]">
                  <label className="text-xs font-medium text-gray-700">
                    Active Offering
                    <select
                      value={selectedCourseId}
                      onChange={(event) => {
                        const courseId = event.target.value;
                        setSelectedCourseIds((current) => ({ ...current, [draftIndex]: courseId }));
                        const course = courses.find((item) => item.id === courseId);
                        if (course) {
                          setSelectedMajorIds((current) => ({ ...current, [draftIndex]: course.majorId }));
                          updateDraft(draftIndex, { courseCode: course.code, courseName: course.name });
                        }
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select active offering...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>{course.code} - {course.name} ({course.major.name})</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-700">
                    Major
                    <select
                      value={selectedMajorId}
                      disabled={Boolean(selectedCourse)}
                      onChange={(event) => setSelectedMajorIds((current) => ({ ...current, [draftIndex]: event.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                    >
                      <option value="">Select major</option>
                      {majors.map((major) => <option key={major.id} value={major.id}>{major.name}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <label className="text-xs font-medium text-gray-700">
                  Course Code
                  <input value={draft.courseCode} onChange={(event) => updateDraft(draftIndex, { courseCode: event.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </label>
                <label className="md:col-span-2 text-xs font-medium text-gray-700">
                  Course Name
                  <input value={draft.courseName} onChange={(event) => updateDraft(draftIndex, { courseName: event.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </label>
              </div>

              {draft.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-5 space-y-1">
                  {draft.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
                </div>
              )}

              {issues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-5 space-y-1">
                  {issues.map((issue, index) => <p key={index}>{issue}</p>)}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Learning Outcomes ({draft.learningOutcomes.length})</h3>
                  <button onClick={() => addLO(draftIndex)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">Add CLO</button>
                </div>
                <div className="space-y-2">
                  {draft.learningOutcomes.map((lo, loIndex) => (
                    <div key={loIndex} className="grid grid-cols-1 md:grid-cols-[110px_1fr_70px] gap-2">
                      <input value={lo.code} onChange={(event) => updateLO(draftIndex, loIndex, { code: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                      <input value={lo.description} onChange={(event) => updateLO(draftIndex, loIndex, { description: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <button onClick={() => removeLO(draftIndex, loIndex)} className="text-red-600 text-xs">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Topics ({draft.topics.length})</h3>
                <div className="space-y-3">
                  {draft.topics.map((topic, topicIndex) => (
                    <div key={topicIndex} className="border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_70px] gap-2 mb-2">
                        <input value={topic.name} onChange={(event) => updateTopic(draftIndex, topicIndex, { name: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium" />
                        <button onClick={() => removeTopic(draftIndex, topicIndex)} className="text-red-600 text-xs">Remove</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {draft.learningOutcomes.map((lo) => {
                          const code = normalizeCode(lo.code);
                          const active = topic.loCodes.includes(code);
                          return (
                            <button
                              key={code}
                              onClick={() => toggleTopicLO(draftIndex, topicIndex, code)}
                              className={`px-2 py-1 rounded text-xs font-mono border ${
                                active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                              }`}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </details>
          );
        })}
      </div>

      {drafts.length > 0 && (
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 mt-6 py-4 flex justify-end">
          <button
            onClick={importDrafts}
            disabled={importing || getValidDrafts().length === 0}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : `Import ${getValidDrafts().length} Valid Syllabi`}
          </button>
        </div>
      )}
    </div>
  );
}
