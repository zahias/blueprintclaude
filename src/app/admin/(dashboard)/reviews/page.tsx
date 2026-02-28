"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";

interface Blueprint {
  id: string;
  accessToken: string;
  title: string;
  instructorName: string;
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

export default function ReviewsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function loadBlueprints() {
    const url = filter ? `/api/blueprints?status=${filter}` : "/api/blueprints";
    const res = await fetch(url);
    if (res.ok) setBlueprints(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadBlueprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blueprint Reviews</h1>
        <div className="flex gap-2">
          {["", "SUBMITTED", "APPROVED", "REJECTED", "DRAFT"].map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s ? BLUEPRINT_STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>
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
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Course</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Instructor</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Total Marks</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Topics</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blueprints.map((bp) => (
                <tr key={bp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{bp.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{bp.course.code} — {bp.course.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{bp.instructorName}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{bp.totalMarks}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{bp._count.topics}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${BLUEPRINT_STATUS_COLORS[bp.status]}`}>
                      {BLUEPRINT_STATUS_LABELS[bp.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/reviews/${bp.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm">
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
