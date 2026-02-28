"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS, SEMESTERS, getAcademicYears } from "@/lib/constants";

interface Blueprint {
  id: string;
  accessToken: string;
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

export default function InstructorDashboard() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const academicYears = getAcademicYears();

  async function loadBlueprints() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (semesterFilter) params.set("semester", semesterFilter);
    if (yearFilter) params.set("academicYear", yearFilter);
    const url = `/api/instructor/blueprints?${params.toString()}`;
    const res = await fetch(url);
    if (res.ok) setBlueprints(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    loadBlueprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, semesterFilter, yearFilter]);

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Blueprints</h1>
        <Link
          href="/instructor/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition font-medium"
        >
          + New Blueprint
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-1">
          {["", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s ? BLUEPRINT_STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>
        {/* Semester filter */}
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
        {/* Year filter */}
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
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-2">No blueprints found.</p>
          <Link href="/instructor/new" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            Create your first blueprint →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Course</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Semester</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Marks</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Comments</th>
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
                  <td className="px-4 py-3 text-sm text-gray-600">{bp.course.code}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {bp.semester && bp.academicYear
                      ? `${bp.semester} ${bp.academicYear}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">{bp.totalMarks}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${BLUEPRINT_STATUS_COLORS[bp.status]}`}>
                      {BLUEPRINT_STATUS_LABELS[bp.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {bp._count.comments > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                        {bp._count.comments}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      href={`/blueprint/${bp.accessToken}`}
                      className="text-indigo-600 hover:text-indigo-800 text-xs"
                    >
                      View
                    </Link>
                    {(bp.status === "DRAFT" || bp.status === "REJECTED") && (
                      <Link
                        href={`/instructor/edit/${bp.accessToken}`}
                        className="text-indigo-600 hover:text-indigo-800 text-xs"
                      >
                        Edit
                      </Link>
                    )}
                    <button
                      onClick={() => copyToken(bp.accessToken, bp.id)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      {copiedId === bp.id ? "Copied!" : "Copy Link"}
                    </button>
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
