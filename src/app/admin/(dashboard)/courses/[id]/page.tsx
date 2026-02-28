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
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // LO form
  const [showLoForm, setShowLoForm] = useState(false);
  const [loForm, setLoForm] = useState({ code: "", description: "" });
  const [editingLoId, setEditingLoId] = useState<string | null>(null);

  // Topic form
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicForm, setTopicForm] = useState({ name: "", description: "", loIds: [] as string[] });
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  async function loadCourse() {
    const res = await fetch(`/api/courses/${id}`);
    if (res.ok) {
      setCourse(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── LO handlers ─────────────────────────────────────────────────

  async function handleLoSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingLoId ? `/api/courses/${id}/los/${editingLoId}` : `/api/courses/${id}/los`;
    const method = editingLoId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loForm),
    });

    setLoForm({ code: "", description: "" });
    setShowLoForm(false);
    setEditingLoId(null);
    loadCourse();
  }

  async function deleteLo(loId: string) {
    if (!confirm("Delete this learning outcome?")) return;
    await fetch(`/api/courses/${id}/los/${loId}`, { method: "DELETE" });
    loadCourse();
  }

  // ─── Topic handlers ──────────────────────────────────────────────

  async function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingTopicId
      ? `/api/courses/${id}/topics/${editingTopicId}`
      : `/api/courses/${id}/topics`;
    const method = editingTopicId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(topicForm),
    });

    setTopicForm({ name: "", description: "", loIds: [] });
    setShowTopicForm(false);
    setEditingTopicId(null);
    loadCourse();
  }

  async function deleteTopic(topicId: string) {
    if (!confirm("Delete this topic?")) return;
    await fetch(`/api/courses/${id}/topics/${topicId}`, { method: "DELETE" });
    loadCourse();
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!course) return <div className="text-red-500">Course not found</div>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/courses" className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block">
          ← Back to Courses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {course.code} — {course.name}
        </h1>
        <p className="text-gray-500 text-sm">{course.major.name} • {course.description || "No description"}</p>
      </div>

      {/* ─── Learning Outcomes ───────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Learning Outcomes ({course.los.length})</h2>
          <button
            onClick={() => {
              setLoForm({ code: "", description: "" });
              setEditingLoId(null);
              setShowLoForm(true);
            }}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            + Add LO
          </button>
        </div>

        {showLoForm && (
          <form onSubmit={handleLoSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                <input
                  value={loForm.code}
                  onChange={(e) => setLoForm({ ...loForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="LO1"
                  required
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={loForm.description}
                  onChange={(e) => setLoForm({ ...loForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Describe the learning outcome"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">
                {editingLoId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={() => { setShowLoForm(false); setEditingLoId(null); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {course.los.length === 0 ? (
          <p className="text-gray-400 text-sm">No learning outcomes defined.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {course.los.map((lo) => (
              <div key={lo.id} className="px-4 py-3 flex items-start justify-between">
                <div>
                  <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-mono font-semibold px-2 py-0.5 rounded mr-2">
                    {lo.code}
                  </span>
                  <span className="text-sm text-gray-700">{lo.description}</span>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => {
                      setLoForm({ code: lo.code, description: lo.description });
                      setEditingLoId(lo.id);
                      setShowLoForm(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs"
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteLo(lo.id)} className="text-red-600 hover:text-red-800 text-xs">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Topics ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Topics ({course.topics.length})</h2>
          <button
            onClick={() => {
              setTopicForm({ name: "", description: "", loIds: [] });
              setEditingTopicId(null);
              setShowTopicForm(true);
            }}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            + Add Topic
          </button>
        </div>

        {showTopicForm && (
          <form onSubmit={handleTopicSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Topic name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Linked Learning Outcomes</label>
              <div className="flex flex-wrap gap-2">
                {course.los.map((lo) => (
                  <label key={lo.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={topicForm.loIds.includes(lo.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...topicForm.loIds, lo.id]
                          : topicForm.loIds.filter((x) => x !== lo.id);
                        setTopicForm({ ...topicForm, loIds: ids });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">{lo.code}</span>
                    <span className="text-gray-600 text-xs truncate max-w-[200px]">{lo.description}</span>
                  </label>
                ))}
              </div>
              {course.los.length === 0 && (
                <p className="text-gray-400 text-xs mt-1">Add learning outcomes first to link them to topics.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">
                {editingTopicId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={() => { setShowTopicForm(false); setEditingTopicId(null); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {course.topics.length === 0 ? (
          <p className="text-gray-400 text-sm">No topics defined.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {course.topics.map((topic) => (
              <div key={topic.id} className="px-4 py-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{topic.name}</p>
                  {topic.description && <p className="text-gray-500 text-xs mt-0.5">{topic.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topic.los.map((tl) => (
                      <span key={tl.learningOutcomeId} className="bg-green-100 text-green-700 text-xs font-mono px-1.5 py-0.5 rounded">
                        {tl.learningOutcome.code}
                      </span>
                    ))}
                    {topic.los.length === 0 && <span className="text-gray-400 text-xs">No LOs linked</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => {
                      setTopicForm({
                        name: topic.name,
                        description: topic.description || "",
                        loIds: topic.los.map((tl) => tl.learningOutcomeId),
                      });
                      setEditingTopicId(topic.id);
                      setShowTopicForm(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs"
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteTopic(topic.id)} className="text-red-600 hover:text-red-800 text-xs">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
