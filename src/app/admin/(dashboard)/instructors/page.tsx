"use client";

import { useEffect, useState } from "react";

interface Instructor {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  _count: { blueprints: number };
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/instructors");
    if (res.ok) setInstructors(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/instructors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instructors</h1>
        <span className="text-sm text-gray-500">{instructors.length} instructor{instructors.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No instructors registered yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Blueprints</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Joined</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instructors.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{inst.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{inst.email}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{inst._count.blueprints}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      inst.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {inst.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {new Date(inst.createdAt).toLocaleDateString()}
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
