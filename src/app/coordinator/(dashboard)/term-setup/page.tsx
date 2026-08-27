"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SyllabusImportPanel } from "@/components/SyllabusImportPanel";
import { statusLabel } from "@/lib/constants";

interface Term {
  id: string;
  semester: string;
  academicYear: string;
  isActive: boolean;
  activatedAt: string | null;
  _count?: { offerings: number };
}

interface Course {
  id: string;
  code: string;
  name: string;
  majorId: string;
  major: { name: string };
}

interface Major {
  id: string;
  name: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
  majors: { major: { id: string; name: string } }[];
}

interface Offering {
  id: string;
  course: Course;
  term: Term;
  instructors: { instructor: Instructor }[];
  syllabi: { id: string; sourceFileName: string | null; isCurrent: boolean }[];
  courseReport: { id: string; status: string; submittedAt: string | null; reviewedAt: string | null } | null;
  _count: { enrollments: number; gradeAssessments: number; blueprints: number };
}

interface ProgressPrefix {
  prefix: string;
  registrations: number;
  courses: number;
  students: number;
}

interface ProgressPreview {
  prefixes: ProgressPrefix[];
  warnings: string[];
  skippedRows: string[];
  registrations: unknown[];
}

type StepId = "term" | "progress" | "syllabi" | "readiness";

interface ReviewCounts {
  blueprints: number;
  gradebooks: number;
  courseReports: number;
  revisions: number;
}

const academicYears = ["2025/2026", "2026/2027", "2027/2028", "2028/2029"];

function initialStepFromPath(): StepId {
  if (typeof window === "undefined") return "term";
  if (window.location.pathname.endsWith("/progress")) return "progress";
  if (window.location.pathname.endsWith("/syllabi")) return "syllabi";
  if (window.location.pathname.endsWith("/readiness")) return "readiness";
  return window.location.hash === "#syllabi" ? "syllabi" : "term";
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

export default function CoordinatorTermSetupPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [termForm, setTermForm] = useState({ semester: "FALL", academicYear: "2026/2027" });
  const [progressFile, setProgressFile] = useState<File | null>(null);
  const [progressPreview, setProgressPreview] = useState<ProgressPreview | null>(null);
  const [prefixMappings, setPrefixMappings] = useState<Record<string, string>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressDetailsOpen, setProgressDetailsOpen] = useState(false);
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [reviewCounts, setReviewCounts] = useState<ReviewCounts>({ blueprints: 0, gradebooks: 0, courseReports: 0, revisions: 0 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState<StepId>(initialStepFromPath);
  const activeTerm = terms.find((term) => term.isActive) || null;
  const hasOfferings = offerings.length > 0;
  const hasSyllabi = offerings.some((offering) => offering.syllabi.length > 0);
  const allOfferingsAssigned = hasOfferings && offerings.every((offering) => offering.instructors.length > 0);
  const totalStudents = offerings.reduce((sum, offering) => sum + offering._count.enrollments, 0);
  const syllabiCount = offerings.filter((offering) => offering.syllabi.length > 0).length;
  const approvedReportsCount = offerings.filter((offering) => offering.courseReport?.status === "APPROVED").length;
  const selectedPrefixCount = Object.values(prefixMappings).filter(Boolean).length;
  const readinessCounts = {
    roster: offerings.filter((offering) => offering._count.enrollments === 0).length,
    syllabus: offerings.filter((offering) => offering.syllabi.length === 0).length,
    instructor: offerings.filter((offering) => offering.instructors.length === 0).length,
    blueprint: offerings.filter((offering) => offering._count.blueprints === 0).length,
    grades: offerings.filter((offering) => offering._count.gradeAssessments === 0).length,
    report: offerings.filter((offering) => offering.courseReport?.status !== "APPROVED").length,
  };
  const filteredOfferings = offerings.filter((offering) => {
    if (readinessFilter === "roster") return offering._count.enrollments === 0;
    if (readinessFilter === "syllabus") return offering.syllabi.length === 0;
    if (readinessFilter === "instructor") return offering.instructors.length === 0;
    if (readinessFilter === "blueprint") return offering._count.blueprints === 0;
    if (readinessFilter === "grades") return offering._count.gradeAssessments === 0;
    if (readinessFilter === "report") return offering.courseReport?.status !== "APPROVED";
    return true;
  });

  async function loadAll() {
    const [termsRes, majorsRes, coursesRes, instructorsRes, blueprintsRes, gradesRes, reportsRes] = await Promise.all([
      fetch("/api/coordinator/terms"),
      fetch("/api/coordinator/majors"),
      fetch("/api/coordinator/courses"),
      fetch("/api/coordinator/instructors"),
      fetch("/api/coordinator/blueprints"),
      fetch("/api/coordinator/grades"),
      fetch("/api/coordinator/course-reports"),
    ]);
    const [termData, majorData, courseData, instructorData, blueprintData, gradeData, reportData] = await Promise.all([
      readJson<Term[] | { error?: string; setupRequired?: boolean }>(termsRes, []),
      readJson<Major[]>(majorsRes, []),
      readJson<Course[]>(coursesRes, []),
      readJson<Instructor[]>(instructorsRes, []),
      readJson<{ status: string }[]>(blueprintsRes, []),
      readJson<{ status: string }[]>(gradesRes, []),
      readJson<{ status: string }[]>(reportsRes, []),
    ]);
    if (!termsRes.ok && !Array.isArray(termData)) setError(termData.error || "Could not load terms.");
    setTerms(Array.isArray(termData) ? termData : []);
    setMajors(Array.isArray(majorData) ? majorData : []);
    setCourses(Array.isArray(courseData) ? courseData : []);
    setInstructors(Array.isArray(instructorData) ? instructorData : []);
    const blueprints = Array.isArray(blueprintData) ? blueprintData : [];
    const grades = Array.isArray(gradeData) ? gradeData : [];
    const reports = Array.isArray(reportData) ? reportData : [];
    setReviewCounts({
      blueprints: blueprints.filter((item) => item.status === "SUBMITTED").length,
      gradebooks: grades.filter((item) => item.status === "SUBMITTED").length,
      courseReports: reports.filter((item) => item.status === "SUBMITTED").length,
      revisions: blueprints.filter((item) => item.status === "NEEDS_REVISION").length
        + grades.filter((item) => item.status === "NEEDS_REVISION").length
        + reports.filter((item) => item.status === "NEEDS_REVISION").length,
    });
  }

  async function loadOfferings(termId?: string) {
    const res = await fetch(`/api/coordinator/course-offerings${termId ? `?termId=${termId}` : ""}`);
    const data = await readJson<Offering[] | { error?: string }>(res, []);
    if (!res.ok && !Array.isArray(data)) setError(data.error || "Could not load course offerings.");
    setOfferings(Array.isArray(data) ? data : []);
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadOfferings(activeTerm?.id); }, [activeTerm?.id]);
  useEffect(() => {
    if (window.location.hash === "#syllabi") setActiveStep("syllabi");
  }, []);

  function openStep(step: StepId) {
    setActiveStep(step);
    const path = step === "term" ? "/coordinator/term-setup" : `/coordinator/term-setup/${step}`;
    window.history.replaceState(null, "", step === "syllabi" ? `${path}#syllabi` : path);
  }

  async function createTerm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/coordinator/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(termForm),
    });
    const data = await readJson<{ error?: string } & Term>(res, {} as { error?: string } & Term);
    if (!res.ok) setError(data.error || "Could not create term");
    else {
      setMessage("Term created.");
      await loadAll();
    }
  }

  async function activate(termId: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/coordinator/terms/${termId}/activate`, { method: "POST" });
    const data = await readJson<{ error?: string; semester?: string; academicYear?: string }>(res, {});
    if (!res.ok) setError(data.error || "Could not activate term");
    else {
      setMessage(`${data.semester} ${data.academicYear} is now active.`);
      await loadAll();
    }
  }

  async function toggleInstructor(offering: Offering, instructorId: string, checked: boolean) {
    const current = new Set(offering.instructors.map((item) => item.instructor.id));
    if (checked) current.add(instructorId);
    else current.delete(instructorId);
    const res = await fetch(`/api/coordinator/course-offerings/${offering.id}/instructors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructorIds: Array.from(current) }),
    });
    const data = await readJson<{ error?: string; assigned?: number }>(res, {});
    if (!res.ok) setError(data.error || "Could not assign instructor");
    else {
      setMessage(`Assigned ${data.assigned} instructor(s).`);
      await loadOfferings(activeTerm?.id);
    }
  }

  async function parseProgressReport(file: File | null) {
    setProgressFile(file);
    setProgressPreview(null);
    setPrefixMappings({});
    if (!file) return;
    setError("");
    setMessage("");
    setProgressLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/coordinator/progress-report/parse", { method: "POST", body: formData });
    const data = await readJson<ProgressPreview & { error?: string }>(res, {} as ProgressPreview & { error?: string });
    if (!res.ok) {
      setError(data.error || "Could not parse progress report.");
    } else {
      setProgressPreview(data);
      setProgressDetailsOpen(false);
      const mappings: Record<string, string> = {};
      data.prefixes.forEach((prefix) => {
        const match = courses.find((course) => course.code.startsWith(prefix.prefix));
        if (match) mappings[prefix.prefix] = match.majorId;
      });
      setPrefixMappings(mappings);
      setMessage(`Detected ${data.prefixes.length} prefix(es) and ${data.registrations.length} current registration(s). Map the prefixes you want to import.`);
    }
    setProgressLoading(false);
  }

  async function importProgressReport() {
    if (!progressFile || !progressPreview || !activeTerm) return;
    setError("");
    setMessage("");
    setProgressLoading(true);
    const formData = new FormData();
    formData.append("file", progressFile);
    formData.append("termId", activeTerm.id);
    formData.append("mappings", JSON.stringify(prefixMappings));
    const res = await fetch("/api/coordinator/progress-report/import", { method: "POST", body: formData });
    const data = await readJson<{
      error?: string;
      importedRegistrations?: number;
      createdCourses?: number;
      reusedCourses?: number;
      createdOfferings?: number;
      reusedOfferings?: number;
      createdEnrollments?: number;
      updatedEnrollments?: number;
      warnings?: string[];
      skippedRows?: string[];
    }>(res, {});
    if (!res.ok) {
      setError(data.error || "Could not import progress report.");
    } else {
      const warningText = data.warnings?.length ? ` ${data.warnings.length} warning(s) returned.` : "";
      setMessage(`Imported ${data.importedRegistrations} registrations. Created ${data.createdCourses} course(s), reused ${data.reusedCourses} course(s), created ${data.createdOfferings} offering(s), reused ${data.reusedOfferings} offering(s), created ${data.createdEnrollments} enrollment(s), and updated ${data.updatedEnrollments} enrollment(s).${warningText}`);
      await Promise.all([loadAll(), loadOfferings(activeTerm.id)]);
    }
    setProgressLoading(false);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Term Setup</h1>
          <p className="text-sm text-gray-500 mt-1">A guided setup flow for the active semester. Complete each screen, then move forward.</p>
        </div>
      </div>

      {(message || error) && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <WorkflowStep
          number="1"
          title="Term"
          detail={activeTerm ? `${activeTerm.semester} ${activeTerm.academicYear} is active.` : "Create or activate the semester/year."}
          state={activeTerm ? "done" : "current"}
          active={activeStep === "term"}
          onClick={() => openStep("term")}
        />
        <WorkflowStep
          number="2"
          title="Import Progress Report"
          detail={hasOfferings ? `${offerings.length} active offering(s) created.` : "Create active offerings and rosters."}
          state={!activeTerm ? "blocked" : hasOfferings ? "done" : "current"}
          active={activeStep === "progress"}
          onClick={() => activeTerm && openStep("progress")}
        />
        <WorkflowStep
          number="3"
          title="Upload Syllabi"
          detail={hasSyllabi ? "At least one offering has a syllabus." : "Attach CLOs and topics to offerings."}
          state={!hasOfferings ? "blocked" : hasSyllabi ? "done" : "current"}
          active={activeStep === "syllabi"}
          onClick={() => hasOfferings && openStep("syllabi")}
        />
        <WorkflowStep
          number="4"
          title="Assign and Check"
          detail={allOfferingsAssigned ? "All offerings have instructors." : "Assign instructors and review readiness."}
          state={!hasOfferings ? "blocked" : allOfferingsAssigned ? "done" : "current"}
          active={activeStep === "readiness"}
          onClick={() => hasOfferings && openStep("readiness")}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryTile label="Active term" value={activeTerm ? `${activeTerm.semester} ${activeTerm.academicYear}` : "None"} />
        <SummaryTile label="Offerings" value={String(offerings.length)} />
        <SummaryTile label="Roster students" value={String(totalStudents)} />
        <SummaryTile label="Syllabi uploaded" value={`${syllabiCount}/${offerings.length || 0}`} />
        <SummaryTile label="Course reports approved" value={`${approvedReportsCount}/${offerings.length || 0}`} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <ReviewShortcut href="/coordinator/blueprints" label="Blueprints pending" value={reviewCounts.blueprints} />
        <ReviewShortcut href="/coordinator/grades" label="Gradebooks pending" value={reviewCounts.gradebooks} />
        <ReviewShortcut href="/coordinator/course-reports" label="Course reports pending" value={reviewCounts.courseReports} />
        <ReviewShortcut href="/coordinator/blueprints" label="Items needing revision" value={reviewCounts.revisions} muted />
      </div>

      {activeStep === "term" && (
      <StepShell
        number="1"
        title="Term"
        description="Create the semester/year if needed, then make it the active setup term."
        footer={(
          <button
            onClick={() => activeTerm && openStep("progress")}
            disabled={!activeTerm}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            Continue to Progress Report
          </button>
        )}
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={createTerm} className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Create or reuse term</p>
            <div className="space-y-3">
              <select value={termForm.semester} onChange={(e) => setTermForm({ ...termForm, semester: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="FALL">Fall</option>
                <option value="SPRING">Spring</option>
                <option value="SUMMER">Summer</option>
              </select>
              <select value={termForm.academicYear} onChange={(e) => setTermForm({ ...termForm, academicYear: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Create or Reuse</button>
            </div>
          </form>

          <div className="xl:col-span-2">
            <div className="mb-3 rounded-xl bg-teal-50 border border-teal-100 p-4">
              <p className="text-xs uppercase tracking-wide text-teal-700 font-semibold">Active setup term</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {activeTerm ? `${activeTerm.semester} ${activeTerm.academicYear}` : "No active term yet"}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {activeTerm ? "Progress reports, syllabi, and assignments will apply to this term." : "Activate a term before importing progress reports or syllabi."}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {terms.map((term) => (
                <div key={term.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">{term.semester} {term.academicYear}</p>
                    {term.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Active</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{term._count?.offerings ?? 0} offering(s)</p>
                  {!term.isActive && (
                    <button onClick={() => activate(term.id)} className="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700">
                      Activate
                    </button>
                  )}
                </div>
              ))}
              {terms.length === 0 && (
                <div className="md:col-span-3 rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
                  No terms exist yet. Create the first term to start setup.
                </div>
              )}
            </div>
          </div>
        </div>
      </StepShell>
      )}

      {activeStep === "progress" && (
      <StepShell
        number="2"
        title="Import Progress Report"
        description="Upload the college progress report, map detected prefixes to majors, and populate active-term offerings and rosters."
        context={activeTerm ? `${activeTerm.semester} ${activeTerm.academicYear}` : "No active term"}
        footer={(
          <div className="flex gap-2">
            <button onClick={() => openStep("term")} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={() => openStep("syllabi")}
              disabled={!hasOfferings}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              Continue to Syllabi
            </button>
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="file"
            accept=".xlsx"
            disabled={!activeTerm || progressLoading}
            onChange={(e) => parseProgressReport(e.target.files?.[0] || null)}
            className="text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 disabled:opacity-50"
          />
          {progressPreview && (
            <button
              onClick={importProgressReport}
              disabled={progressLoading || Object.values(prefixMappings).filter(Boolean).length === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {progressLoading ? "Importing..." : "Import Selected Prefixes"}
            </button>
          )}
        </div>

        {progressPreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <PreviewMetric label="Prefixes" value={progressPreview.prefixes.length} />
              <PreviewMetric label="Registrations" value={progressPreview.registrations.length} />
              <PreviewMetric label="Selected Prefixes" value={selectedPrefixCount} />
              <PreviewMetric label="Notes" value={progressPreview.warnings.length + progressPreview.skippedRows.length} />
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
              <p><strong>{progressPreview.registrations.length}</strong> current registration(s) detected. Map only prefixes that belong to your assigned majors.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProgressDetailsOpen((open) => !open)}
                  className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                >
                  {progressDetailsOpen ? "Hide prefix mappings" : "Review prefix mappings"}
                </button>
                <button
                  onClick={importProgressReport}
                  disabled={progressLoading || selectedPrefixCount === 0}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {progressLoading ? "Importing..." : "Import Selected Prefixes"}
                </button>
              </div>
            </div>

            {progressDetailsOpen && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Prefix</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">Courses</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">Students</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">Registrations</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Map to Major</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {progressPreview.prefixes.map((prefix) => (
                      <tr key={prefix.prefix}>
                        <td className="px-4 py-3 font-mono font-semibold text-teal-700">{prefix.prefix}</td>
                        <td className="px-4 py-3 text-center">{prefix.courses}</td>
                        <td className="px-4 py-3 text-center">{prefix.students}</td>
                        <td className="px-4 py-3 text-center">{prefix.registrations}</td>
                        <td className="px-4 py-3">
                          <select
                            value={prefixMappings[prefix.prefix] || ""}
                            onChange={(e) => setPrefixMappings({ ...prefixMappings, [prefix.prefix]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Skip this prefix</option>
                            {majors.map((major) => <option key={major.id} value={major.id}>{major.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(progressPreview.warnings.length > 0 || progressPreview.skippedRows.length > 0) && (
              <details className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800">
                <summary className="cursor-pointer font-semibold text-amber-900">Show import notes ({progressPreview.warnings.length + progressPreview.skippedRows.length})</summary>
                <div className="mt-2 space-y-1">
                  {[...progressPreview.warnings, ...progressPreview.skippedRows].map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
                </div>
              </details>
            )}
          </div>
        )}
      </StepShell>
      )}

      {activeStep === "syllabi" && (
      <section id="syllabi" className="mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">3. Upload Syllabi</h2>
            <p className="text-sm text-gray-500">Bulk import syllabi for active-term offerings after the progress report has created the course list.</p>
          </div>
        </div>
        {hasOfferings ? (
          <SyllabusImportPanel
            embedded
            fixedTermId={activeTerm?.id || ""}
            onImported={() => loadOfferings(activeTerm?.id)}
          />
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            Import the progress report first. Syllabi can only be matched to active offerings created from the progress report.
          </div>
        )}
        {hasSyllabi && (
          <div className="mt-5 flex justify-between">
            <button
              onClick={() => openStep("progress")}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => openStep("readiness")}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
            >
              Continue to Assignments
            </button>
          </div>
        )}
      </section>
      )}

      {activeStep === "readiness" && (
      <StepShell
        number="4"
        title="Assign Instructors and Check Readiness"
        description="Assign instructors and review missing setup items by course."
        context={activeTerm ? `${activeTerm.semester} ${activeTerm.academicYear}` : "No active term yet"}
        footer={<button onClick={() => openStep("syllabi")} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Back to Syllabi</button>}
      >

        <div className="mb-4 flex flex-wrap gap-2">
          <ReadinessFilter active={readinessFilter === "all"} label="All" count={offerings.length} onClick={() => setReadinessFilter("all")} />
          <ReadinessFilter active={readinessFilter === "roster"} label="Missing roster" count={readinessCounts.roster} onClick={() => setReadinessFilter("roster")} />
          <ReadinessFilter active={readinessFilter === "syllabus"} label="Missing syllabus" count={readinessCounts.syllabus} onClick={() => setReadinessFilter("syllabus")} />
          <ReadinessFilter active={readinessFilter === "instructor"} label="Missing instructor" count={readinessCounts.instructor} onClick={() => setReadinessFilter("instructor")} />
          <ReadinessFilter active={readinessFilter === "blueprint"} label="Missing blueprint" count={readinessCounts.blueprint} onClick={() => setReadinessFilter("blueprint")} />
          <ReadinessFilter active={readinessFilter === "grades"} label="Missing grades" count={readinessCounts.grades} onClick={() => setReadinessFilter("grades")} />
          <ReadinessFilter active={readinessFilter === "report"} label="Missing approved report" count={readinessCounts.report} onClick={() => setReadinessFilter("report")} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Syllabus</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Assign Instructors</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Roster</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Blueprints</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Grades</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Course Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOfferings.map((offering) => {
                const eligible = instructors.filter((instructor) => instructor.majors.some((item) => item.major.id === offering.course.majorId));
                const assigned = new Set(offering.instructors.map((item) => item.instructor.id));
                return (
                  <tr key={offering.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-teal-600">{offering.course.code}</p>
                      <p className="font-medium text-gray-900">{offering.course.name}</p>
                      <p className="text-xs text-gray-400">{offering.course.major.name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {offering.syllabi[0]?.sourceFileName || "Not uploaded"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {eligible.map((instructor) => (
                          <label key={instructor.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                            <input
                              type="checkbox"
                              checked={assigned.has(instructor.id)}
                              onChange={(e) => toggleInstructor(offering, instructor.id, e.target.checked)}
                            />
                            {instructor.name}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusPill ok={offering._count.enrollments > 0} label={`${offering._count.enrollments} students`} /></td>
                    <td className="px-4 py-3 text-center"><StatusPill ok={offering._count.blueprints > 0} label={`${offering._count.blueprints} blueprints`} /></td>
                    <td className="px-4 py-3 text-center"><StatusPill ok={offering._count.gradeAssessments > 0} label={`${offering._count.gradeAssessments} assessments`} /></td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill
                        ok={offering.courseReport?.status === "APPROVED"}
                        label={statusLabel(offering.courseReport?.status)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {offerings.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              {activeTerm
                ? "No course offerings yet. Import the progress report first to create active courses and rosters."
                : "Create and activate a term before importing offerings."}
            </div>
          )}
          {offerings.length > 0 && filteredOfferings.length === 0 && (
            <div className="py-8 text-center text-gray-500">No offerings match this readiness filter.</div>
          )}
        </div>
      </StepShell>
      )}
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${ok ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {label}
    </span>
  );
}

function StepShell({
  number,
  title,
  description,
  context,
  footer,
  children,
}: {
  number: string;
  title: string;
  description: string;
  context?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">{number}</span>
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {context && <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{context}</span>}
      </div>
      <div className="p-5">{children}</div>
      {footer && <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-5 py-4">{footer}</div>}
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ReadinessFilter({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-teal-600 bg-teal-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50"
      }`}
    >
      {label} <span className={active ? "text-teal-100" : "text-gray-400"}>{count}</span>
    </button>
  );
}

function WorkflowStep({
  number,
  title,
  detail,
  state,
  active,
  onClick,
}: {
  number: string;
  title: string;
  detail: string;
  state: "done" | "current" | "blocked";
  active: boolean;
  onClick: () => void;
}) {
  const styles = {
    done: "border-green-200 bg-green-50 text-green-700",
    current: "border-teal-200 bg-teal-50 text-teal-700",
    blocked: "border-gray-200 bg-gray-50 text-gray-400",
  }[state];
  const dotStyles = {
    done: "bg-green-600 text-white",
    current: "bg-teal-600 text-white",
    blocked: "bg-gray-200 text-gray-500",
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "blocked"}
      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${styles} ${active ? "ring-2 ring-teal-500 ring-offset-2" : "hover:border-teal-300"}`}
    >
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${dotStyles}`}>{number}</div>
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-current">{detail}</p>
    </button>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ReviewShortcut({ href, label, value, muted = false }: { href: string; label: string; value: number; muted?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition ${
        muted
          ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
          : value > 0
            ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Link>
  );
}
