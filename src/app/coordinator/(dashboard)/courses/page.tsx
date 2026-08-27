"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  majorId: string;
  code: string;
  name: string;
  description: string | null;
  major: { name: string };
  _count: { topics: number; los: number; blueprints: number };
}

interface Major {
  id: string;
  name: string;
}

export default function CoordinatorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMajor, setFilterMajor] = useState("");
  const [search, setSearch] = useState("");

  async function loadData() {
    const [coursesRes, majorsRes] = await Promise.all([
      fetch("/api/coordinator/courses"),
      fetch("/api/coordinator/majors"),
    ]);
    setCourses(await coursesRes.json());
    setMajors(await majorsRes.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = courses.filter((course) => {
    if (filterMajor && course.majorId !== filterMajor) return false;
    const normalized = search.trim().toLowerCase();
    if (!normalized) return true;
    return `${course.code} ${course.name}`.toLowerCase().includes(normalized);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses & Syllabi</h1>
          <p className="text-sm text-gray-500 mt-1">Courses are created through progress report import and completed through syllabus import.</p>
        </div>
        <Link href="/coordinator/term-setup#syllabi" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium">
          Import Progress Report / Syllabi
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
          <option value="">All My Majors</option>
          {majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search course code or name..."
          className="min-w-72 flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} of {courses.length} course{courses.length === 1 ? "" : "s"}</span>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {majors.length === 0
            ? "No majors assigned to you yet. Ask an admin to assign majors."
            : courses.length === 0
              ? "No courses yet. Import a progress report to create active-term courses."
              : `No courses match "${search}".`}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Code</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Major</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Topics</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">LOs</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{course.code}</td>
                  <td className="px-6 py-4 text-gray-900">{course.name}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{course.major.name}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{course._count.topics}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{course._count.los}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/coordinator/courses/${course.id}`} className="text-teal-600 hover:text-teal-800 text-sm font-medium">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
