"use client";

import { useEffect, useState } from "react";

interface Major {
  id: string;
  name: string;
  description: string | null;
  _count: { courses: number };
}

export default function MajorsPage() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  async function loadMajors() {
    const res = await fetch("/api/majors");
    const data = await res.json();
    setMajors(data);
    setLoading(false);
  }

  useEffect(() => {
    loadMajors();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/majors/${editingId}` : "/api/majors";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({ name: "", description: "" });
    setShowForm(false);
    setEditingId(null);
    loadMajors();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this major and all its courses?")) return;
    await fetch(`/api/majors/${id}`, { method: "DELETE" });
    loadMajors();
  }

  function startEdit(major: Major) {
    setForm({ name: major.name, description: major.description || "" });
    setEditingId(major.id);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Majors</h1>
        <button
          onClick={() => {
            setForm({ name: "", description: "" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          + Add Major
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{editingId ? "Edit Major" : "New Major"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="e.g., Computer Science"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">
              {editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : majors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No majors defined yet.</p>
          <p className="text-sm">Click &quot;Add Major&quot; to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Description</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Courses</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {majors.map((major) => (
                <tr key={major.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{major.name}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{major.description || "—"}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{major._count.courses}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => startEdit(major)} className="text-indigo-600 hover:text-indigo-800 text-sm">Edit</button>
                    <button onClick={() => handleDelete(major.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
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
