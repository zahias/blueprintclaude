"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";

interface Blueprint {
  id: string;
  title: string;
  instructorName: string;
  semester: string | null;
  academicYear: string | null;
  totalMarks: number;
  status: string;
  updatedAt: string;
  course: {
    code: string;
    name: string;
    major: { name: string };
  };
  _count: { topics: number; comments: number };
}

interface Major {
  id: string;
  name: string;
}

interface ActiveTerm {
  id: string;
  semester: string;
  academicYear: string;
}

export default function CoordinatorBlueprintReviewPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [activeTerm, setActiveTerm] = useState<ActiveTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [majorFilter, setMajorFilter] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadBlueprints() {
      setError("");
      const [blueprintsRes, majorsRes, termRes] = await Promise.all([
        fetch("/api/coordinator/blueprints"),
        fetch("/api/coordinator/majors"),
        fetch("/api/terms/active"),
      ]);
      if (majorsRes.ok) setMajors(await majorsRes.json());
      if (termRes.ok) {
        const term = await termRes.json();
        setActiveTerm(term?.id ? term : null);
      }
      if (blueprintsRes.ok) {
        setBlueprints(await blueprintsRes.json());
      } else {
        const data = await blueprintsRes.json().catch(() => ({}));
        setError(data.error || "Could not load blueprint reviews. Please log in again.");
      }
      setLoading(false);
    }
    loadBlueprints();
  }, []);

  const instructors = useMemo(() => Array.from(new Set(blueprints.map((bp) => bp.instructorName))).sort(), [blueprints]);
  const counts = useMemo(() => ({
    pending: blueprints.filter((bp) => bp.status === "SUBMITTED").length,
    approved: blueprints.filter((bp) => bp.status === "APPROVED").length,
    revision: blueprints.filter((bp) => bp.status === "NEEDS_REVISION").length,
  }), [blueprints]);
  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return blueprints.filter((bp) => {
      if (statusFilter && bp.status !== statusFilter) return false;
      if (majorFilter && bp.course.major.name !== majorFilter) return false;
      if (instructorFilter && bp.instructorName !== instructorFilter) return false;
      if (normalized) {
        const haystack = `${bp.title} ${bp.course.code} ${bp.course.name}`.toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }
      return true;
    });
  }, [blueprints, instructorFilter, majorFilter, search, statusFilter]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blueprint Review</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review submitted blueprints for assigned majors
              {activeTerm ? ` • Active term: ${activeTerm.semester} ${activeTerm.academicYear}` : ""}.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReviewMetric label="Pending Review" value={counts.pending} tone="blue" />
          <ReviewMetric label="Needs Revision" value={counts.revision} tone="amber" />
          <ReviewMetric label="Approved" value={counts.approved} tone="green" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1">
            {["SUBMITTED", "NEEDS_REVISION", "APPROVED", ""].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === s ? "bg-teal-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s ? BLUEPRINT_STATUS_LABELS[s] : "All"}
              </button>
            ))}
          </div>
          <select value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
            <option value="">All majors</option>
            {majors.map((major) => <option key={major.id} value={major.name}>{major.name}</option>)}
          </select>
          <select value={instructorFilter} onChange={(e) => setInstructorFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
            <option value="">All instructors</option>
            {instructors.map((instructor) => <option key={instructor} value={instructor}>{instructor}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-72 flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            placeholder="Search course code, course name, or blueprint title..."
          />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-xl">
          {majors.length === 0
            ? "No majors are assigned to this coordinator. Ask an admin to assign majors."
            : statusFilter === "SUBMITTED"
              ? "No submitted blueprints are awaiting review for these filters."
              : "No blueprints found for these filters."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Course</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Blueprint</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Instructor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Major</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Questions</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Comments</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((bp) => (
                <tr key={bp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-teal-600">{bp.course.code}</p>
                    <p className="text-sm font-medium text-gray-900">{bp.course.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{bp.title}</p>
                    <p className="text-xs text-gray-400">Updated {new Date(bp.updatedAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bp.instructorName}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{bp.course.major.name}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{bp.totalMarks}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${BLUEPRINT_STATUS_COLORS[bp.status]}`}>
                      {BLUEPRINT_STATUS_LABELS[bp.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{bp._count.comments || "—"}</td>
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

function ReviewMetric({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "green" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-green-50 text-green-700 border-green-100",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
