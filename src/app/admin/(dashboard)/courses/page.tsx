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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ majorId: "", code: "", name: "", description: "" });
  const [filterMajor, setFilterMajor] = useState("");

  async function loadData() {
    const [coursesRes, majorsRes] = await Promise.all([
      fetch("/api/courses"),
      fetch("/api/majors"),
    ]);
    setCourses(await coursesRes.json());
    setMajors(await majorsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/courses/${editingId}` : "/api/courses";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({ majorId: "", code: "", name: "", description: "" });
    setShowForm(false);
    setEditingId(null);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this course and all its data?")) return;
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    loadData();
  }

  function startEdit(course: Course) {
    setForm({
      majorId: course.majorId,
      code: course.code,
      name: course.name,
      description: course.description || "",
    });
    setEditingId(course.id);
    setShowForm(true);
  }

  const filtered = filterMajor ? courses.filter((c) => c.majorId === filterMajor) : courses;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <button
          onClick={() => {
            setForm({ majorId: majors[0]?.id || "", code: "", name: "", description: "" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          + Add Course
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterMajor}
          onChange={(e) => setFilterMajor(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Majors</option>
          {majors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{editingId ? "Edit Course" : "New Course"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                <select
                  value={form.majorId}
                  onChange={(e) => setForm({ ...form, majorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Select Major</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., CS201"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Data Structures"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">
              {editingId ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No courses found.</div>
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
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
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
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link href={`/admin/courses/${course.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm">Manage</Link>
                    <button onClick={() => startEdit(course)} className="text-indigo-600 hover:text-indigo-800 text-sm">Edit</button>
                    <button onClick={() => handleDelete(course.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
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
