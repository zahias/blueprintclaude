"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS, SEMESTERS, getAcademicYears } from "@/lib/constants";

interface Blueprint {
  id: string;
  title: string;
  instructorName: string;
  semester: string | null;
  academicYear: string | null;
  totalMarks: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  course: {
    code: string;
    name: string;
    major: { name: string };
  };
  _count: { topics: number; comments: number };
}

export default function CoordinatorDashboard() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const academicYears = getAcademicYears();

  async function loadBlueprints() {
    const res = await fetch("/api/coordinator/blueprints");
    if (res.ok) {
      const all: Blueprint[] = await res.json();
      let filtered = all;
      if (statusFilter) filtered = filtered.filter((b) => b.status === statusFilter);
      if (semesterFilter) filtered = filtered.filter((b) => b.semester === semesterFilter);
      if (yearFilter) filtered = filtered.filter((b) => b.academicYear === yearFilter);
      setBlueprints(filtered);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    loadBlueprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, semesterFilter, yearFilter]);

  const pendingCount = blueprints.filter((b) => b.status === "SUBMITTED").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blueprint Reviews</h1>
          {statusFilter === "SUBMITTED" && pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-1">{pendingCount} blueprint{pendingCount !== 1 ? "s" : ""} awaiting review</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1">
          {["", "SUBMITTED", "APPROVED", "NEEDS_REVISION"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s ? "bg-teal-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s ? BLUEPRINT_STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
        >
          <option value="">All Semesters</option>
          {SEMESTERS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
        >
          <option value="">All Years</option>
          {academicYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : blueprints.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No blueprints found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Course</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Instructor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Semester</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Marks</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blueprints.map((bp) => (
                <tr key={bp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{bp.title}</p>
                    <p className="text-xs text-gray-400">{new Date(bp.updatedAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bp.course.code} — {bp.course.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bp.instructorName}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {bp.semester && bp.academicYear
                      ? `${bp.semester} ${bp.academicYear}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{bp.totalMarks}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${BLUEPRINT_STATUS_COLORS[bp.status]}`}>
                      {BLUEPRINT_STATUS_LABELS[bp.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/coordinator/review/${bp.id}`} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                      Review
                    </Link>
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
