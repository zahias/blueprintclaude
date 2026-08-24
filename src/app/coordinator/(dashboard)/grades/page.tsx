"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GradebookRow {
  id: string;
  status: string;
  submittedAt: string | null;
  instructor: { name: string; email: string };
  course: { code: string; name: string; major: { name: string } };
  assessmentCount: number;
  rosterCount: number;
  _count: { entries: number; comments: number };
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    NEEDS_REVISION: "bg-amber-100 text-amber-700",
  };
  return styles[status] || "bg-gray-100 text-gray-700";
}

export default function CoordinatorGradesPage() {
  const [gradebooks, setGradebooks] = useState<GradebookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");

  useEffect(() => {
    fetch("/api/coordinator/grades")
      .then((res) => res.json())
      .then((data) => {
        setGradebooks(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const filtered = statusFilter ? gradebooks.filter((gradebook) => gradebook.status === statusFilter) : gradebooks;
  const pending = gradebooks.filter((gradebook) => gradebook.status === "SUBMITTED").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade Approvals</h1>
          {pending > 0 && <p className="text-sm text-amber-600 mt-1">{pending} gradebook{pending !== 1 ? "s" : ""} awaiting approval</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-6">
        {["", "SUBMITTED", "APPROVED", "NEEDS_REVISION"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === status ? "bg-teal-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {status ? status.replace("_", " ") : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">No grade submissions found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Course</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Instructor</th>
                <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Assessments</th>
                <th className="text-center px-5 py-3 text-sm font-medium text-gray-500">Students</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((gradebook) => (
                <tr key={gradebook.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-900">{gradebook.course.code} — {gradebook.course.name}</p>
                    <p className="text-xs text-gray-400">{gradebook.course.major.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{gradebook.instructor.name}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadge(gradebook.status)}`}>
                      {gradebook.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-700">{gradebook.assessmentCount}</td>
                  <td className="px-5 py-4 text-center text-sm text-gray-700">{gradebook.rosterCount}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/coordinator/grades/${gradebook.id}`} className="text-teal-600 hover:text-teal-800 text-sm font-medium">
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
