"use client";

import { useEffect, useState } from "react";

interface Major {
  id: string;
  name: string;
}

interface Coordinator {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  _count: { comments: number };
  assignedMajors: Major[];
}

export default function CoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [allMajors, setAllMajors] = useState<Major[]>([]);
  const [togglingMajor, setTogglingMajor] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/coordinators");
    if (res.ok) setCoordinators(await res.json());
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

  async function toggleMajor(coordId: string, majorId: string) {
    setTogglingMajor(`${coordId}-${majorId}`);
    const coord = coordinators.find((c) => c.id === coordId);
    if (!coord) return;
    const currentIds = coord.assignedMajors.map((m) => m.id);
    const newIds = currentIds.includes(majorId)
      ? currentIds.filter((id) => id !== majorId)
      : [...currentIds, majorId];
    await fetch(`/api/admin/coordinators/${coordId}/majors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorIds: newIds }),
    });
    // Optimistic update
    setCoordinators((prev) =>
      prev.map((c) =>
        c.id === coordId
          ? { ...c, assignedMajors: allMajors.filter((m) => newIds.includes(m.id)) }
          : c
      )
    );
    setTogglingMajor(null);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/coordinators/${id}`, {
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
      const res = await fetch("/api/admin/coordinators", {
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
        setFormError(data.error || "Failed to create coordinator");
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
        <h1 className="text-2xl font-bold text-gray-900">Coordinators</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ Add Coordinator"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Coordinator</h2>
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
              {saving ? "Creating..." : "Create Coordinator"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : coordinators.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No coordinators yet. Add one above.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Majors</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Reviews</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coordinators.map((coord) => (
                <tr key={coord.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{coord.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{coord.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {allMajors.map((m) => {
                        const assigned = coord.assignedMajors.some((am) => am.id === m.id);
                        const isToggling = togglingMajor === `${coord.id}-${m.id}`;
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleMajor(coord.id, m.id)}
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
                  <td className="px-6 py-4 text-center text-gray-700">{coord._count.comments}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      coord.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {coord.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleActive(coord.id, !coord.isActive)}
                      className={`text-sm font-medium ${
                        coord.isActive
                          ? "text-red-600 hover:text-red-800"
                          : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {coord.isActive ? "Disable" : "Enable"}
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
