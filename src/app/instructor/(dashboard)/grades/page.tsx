"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Major {
  id: string;
  name: string;
}

interface Course {
  id: string;
  activeOfferingId?: string | null;
  code: string;
  name: string;
  editable?: boolean;
  term?: { semester: string; academicYear: string } | null;
  major: { id: string; name: string };
  _count: { blueprints: number; enrollments?: number; gradeAssessments?: number };
  gradebookStatus?: string | null;
}

export default function InstructorGradesPage() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [courseRes, majorsRes] = await Promise.all([
        fetch("/api/instructor/courses"),
        fetch("/api/instructor/majors"),
      ]);
      if (majorsRes.ok) setMajors(await majorsRes.json());
      if (!courseRes.ok) {
        const data = await courseRes.json().catch(() => ({}));
        setError(data.error || "Could not load instructor courses. Please log in again.");
        setLoading(false);
        return;
      }
      const instructorCourses: Course[] = await courseRes.json();
      setCourses(instructorCourses);
      setLoading(false);
    }
    load();
  }, []);

  const activeCourses = courses
    .filter((course) => course.editable)
    .sort((a, b) => gradeStatusPriority(a.gradebookStatus) - gradeStatusPriority(b.gradebookStatus));
  const historicalCourses = courses.filter((course) => !course.editable);
  const statusSummary = activeCourses.reduce((summary, course) => {
    summary[gradeStatusKey(course.gradebookStatus)]++;
    return summary;
  }, { revision: 0, pending: 0, draft: 0, approved: 0, notStarted: 0 } as Record<GradeStatusKey, number>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
          <p className="text-sm text-gray-500 mt-1">Active-term courses are editable. Previous terms are available for review only.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700">{error}</div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          {majors.length === 0
            ? "No majors are assigned to this instructor. Ask an admin to assign majors."
            : "No active course offerings are assigned yet. Ask the coordinator to create active-term offerings and assign you."}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusCard label="Needs revision" value={statusSummary.revision} tone="amber" />
            <StatusCard label="Pending approval" value={statusSummary.pending} tone="blue" />
            <StatusCard label="Draft" value={statusSummary.draft} tone="gray" />
            <StatusCard label="Approved" value={statusSummary.approved} tone="green" />
            <StatusCard label="Not started" value={statusSummary.notStarted} tone="gray" />
          </div>
          <CourseTable title="Active Term" courses={activeCourses} empty="No active-term course assignments yet." />
          {historicalCourses.length > 0 && (
            <CourseTable title="Previous Terms / Read Only" courses={historicalCourses} empty="No previous-term courses." />
          )}
        </div>
      )}
    </div>
  );
}

function CourseTable({ title, courses, empty }: { title: string; courses: Course[]; empty: string }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400">{courses.length} course{courses.length === 1 ? "" : "s"}</span>
      </div>
      {courses.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{empty}</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Course</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Term</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Major</th>
              <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Students</th>
              <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Assessments</th>
              <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Grade Status</th>
              <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Blueprints</th>
              <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses.map((course) => (
              <tr key={course.activeOfferingId || `${course.id}-legacy`} className="hover:bg-gray-50">
                <td className="px-5 py-4">
                  <p className="font-mono text-xs text-indigo-600">{course.code}</p>
                  <p className="font-medium text-gray-900">{course.name}</p>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {course.term ? `${course.term.semester} ${course.term.academicYear}` : "Legacy"}
                  {!course.editable && <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Read only</span>}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{course.major.name}</td>
                <td className="px-5 py-4 text-center text-sm text-gray-700">{course._count.enrollments ?? 0}</td>
                <td className="px-5 py-4 text-center text-sm text-gray-700">{course._count.gradeAssessments ?? 0}</td>
                <td className="px-5 py-4 text-center">
                  <GradeStatus status={course.gradebookStatus} />
                </td>
                <td className="px-5 py-4 text-center text-sm text-gray-700">{course._count.blueprints}</td>
                <td className="px-5 py-4 text-right">
                  <Link href={`/instructor/grades/${course.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    {course.editable ? "Open Gradebook" : "View Gradebook"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function GradeStatus({ status }: { status?: string | null }) {
  const key = gradeStatusKey(status);
  if (key === "notStarted") return <span className="text-xs rounded-full bg-gray-100 text-gray-500 px-2 py-1 font-semibold">Not started</span>;
  if (key === "approved") return <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-1 font-semibold">Approved</span>;
  if (key === "pending") return <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1 font-semibold">Pending approval</span>;
  if (key === "revision") return <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-1 font-semibold">Needs revision</span>;
  if (key === "draft") return <span className="text-xs rounded-full bg-gray-100 text-gray-700 px-2 py-1 font-semibold">Draft</span>;
  return <span className="text-xs rounded-full bg-indigo-100 text-indigo-700 px-2 py-1 font-semibold">In progress</span>;
}

type GradeStatusKey = "revision" | "pending" | "draft" | "approved" | "notStarted";

function gradeStatusKey(status?: string | null): GradeStatusKey {
  if (!status) return "notStarted";
  if (status === "NEEDS_REVISION") return "revision";
  if (status === "SUBMITTED") return "pending";
  if (status === "APPROVED") return "approved";
  return "draft";
}

function gradeStatusPriority(status?: string | null) {
  const priorities: Record<GradeStatusKey, number> = { revision: 0, draft: 1, notStarted: 2, pending: 3, approved: 4 };
  return priorities[gradeStatusKey(status)];
}

function StatusCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "green" | "gray" }) {
  const tones = {
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    gray: "bg-white border-gray-200 text-gray-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
