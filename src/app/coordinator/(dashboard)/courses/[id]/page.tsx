"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface LO {
  id: string;
  code: string;
  description: string;
}

interface TopicLO {
  learningOutcomeId: string;
  learningOutcome: LO;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  los: TopicLO[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  major: { name: string };
  topics: Topic[];
  los: LO[];
  syllabi: CourseSyllabus[];
}

interface CourseSyllabus {
  id: string;
  semester: string;
  academicYear: string;
  isCurrent: boolean;
  sourceFileName: string | null;
}

export default function CoordinatorCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState("");

  async function loadCourse() {
    const suffix = selectedSyllabusId ? `?syllabusId=${selectedSyllabusId}` : "";
    const res = await fetch(`/api/courses/${id}${suffix}`);
    if (res.ok) {
      const nextCourse = await res.json();
      setCourse(nextCourse);
      if (!selectedSyllabusId && nextCourse.syllabi?.length) {
        setSelectedSyllabusId(nextCourse.syllabi.find((s: CourseSyllabus) => s.isCurrent)?.id || nextCourse.syllabi[0].id);
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadCourse(); }, [id, selectedSyllabusId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!course) return <div className="text-red-500">Course not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/coordinator/courses" className="text-teal-600 hover:text-teal-800 text-sm mb-2 inline-block">← Back to Courses</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.code} — {course.name}</h1>
            <p className="text-gray-500 text-sm">{course.major.name} &bull; {course.description || "No description"}</p>
          </div>
          <Link href="/coordinator/term-setup#syllabi" className="shrink-0 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium">
            Import New Syllabus
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <label className="block text-xs font-medium text-gray-700 mb-1">Syllabus Version</label>
        <select
          value={selectedSyllabusId || "legacy"}
          onChange={(event) => setSelectedSyllabusId(event.target.value === "legacy" ? "" : event.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
        >
          <option value="legacy">Legacy course setup</option>
          {course.syllabi.map((syllabus) => (
            <option key={syllabus.id} value={syllabus.id}>
              {syllabus.semester} {syllabus.academicYear}{syllabus.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Topics and learning outcomes are set by syllabus import for each term. To change them, import an updated syllabus rather than editing here.
        </p>
      </div>

      {/* Learning Outcomes */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Learning Outcomes ({course.los.length})</h2>

        {course.los.length === 0 ? (
          <p className="text-gray-400 text-sm">No learning outcomes defined for this syllabus version.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {course.los.map((lo) => (
              <div key={lo.id} className="px-4 py-3">
                <span className="inline-block bg-teal-100 text-teal-700 text-xs font-mono font-semibold px-2 py-0.5 rounded mr-2">{lo.code}</span>
                <span className="text-sm text-gray-700">{lo.description}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Topics */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Topics ({course.topics.length})</h2>

        {course.topics.length === 0 ? (
          <p className="text-gray-400 text-sm">No topics defined for this syllabus version.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {course.topics.map((topic) => (
              <div key={topic.id} className="px-4 py-3">
                <p className="font-medium text-gray-900 text-sm">{topic.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {topic.los.map((tl) => (
                    <span key={tl.learningOutcomeId} className="bg-green-100 text-green-700 text-xs font-mono px-1.5 py-0.5 rounded">{tl.learningOutcome.code}</span>
                  ))}
                  {topic.los.length === 0 && <span className="text-gray-400 text-xs">No LOs linked</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
