"use client";

import { useEffect, useState } from "react";

interface Major {
  id: string;
  name: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  _count: { blueprints: number };
  assignedMajors: Major[];
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [allMajors, setAllMajors] = useState<Major[]>([]);
  const [togglingMajor, setTogglingMajor] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/instructors");
    if (res.ok) setInstructors(await res.json());
    setLoading(false);
  }

  async function loadMajors() {
    const res = await fetch("/api/majors");
    if (res.ok) setAllMajors(await res.json());
  }

  useEffect(() => {
    load();
    loadMajors();
  }, []);

  async function toggleMajor(instId: string, majorId: string) {
    setTogglingMajor(`${instId}-${majorId}`);
    const inst = instructors.find((i) => i.id === instId);
    if (!inst) return;
    const currentIds = inst.assignedMajors.map((m) => m.id);
    const newIds = currentIds.includes(majorId)
      ? currentIds.filter((id) => id !== majorId)
      : [...currentIds, majorId];
    await fetch(`/api/admin/instructors/${instId}/majors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorIds: newIds }),
    });
    // Optimistic update
    setInstructors((prev) =>
      prev.map((i) =>
        i.id === instId
          ? { ...i, assignedMajors: allMajors.filter((m) => newIds.includes(m.id)) }
          : i
      )
    );
    setTogglingMajor(null);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/instructors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm({ name: "", email: "", password: "" });
        setShowForm(false);
        await load();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to create instructor");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instructors</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ Add Instructor"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Instructor</h2>
          {formError && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Instructor"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No instructors yet. Add one above.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Majors</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Blueprints</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instructors.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{inst.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{inst.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {allMajors.map((m) => {
                        const assigned = inst.assignedMajors.some((am) => am.id === m.id);
                        const isToggling = togglingMajor === `${inst.id}-${m.id}`;
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleMajor(inst.id, m.id)}
                            disabled={isToggling}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition cursor-pointer ${
                              assigned
                                ? "bg-indigo-100 text-indigo-700 border border-indigo-300 hover:bg-red-100 hover:text-red-700 hover:border-red-300"
                                : "bg-gray-50 text-gray-400 border border-dashed border-gray-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                            } ${isToggling ? "opacity-50" : ""}`}
                            title={assigned ? `Remove ${m.name}` : `Assign ${m.name}`}
                          >
                            {assigned ? "" : "+"} {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">{inst._count.blueprints}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      inst.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {inst.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleActive(inst.id, !inst.isActive)}
                      className={`text-sm font-medium ${
                        inst.isActive
                          ? "text-red-600 hover:text-red-800"
                          : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {inst.isActive ? "Disable" : "Enable"}
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
