"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  majors: number;
  courses: number;
  blueprints: number;
  pendingReviews: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ majors: 0, courses: 0, blueprints: 0, pendingReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [majorsRes, coursesRes, blueprintsRes, pendingRes] = await Promise.all([
          fetch("/api/majors"),
          fetch("/api/courses"),
          fetch("/api/blueprints"),
          fetch("/api/blueprints?status=SUBMITTED"),
        ]);

        const majors = await majorsRes.json();
        const courses = await coursesRes.json();
        const blueprints = await blueprintsRes.json();
        const pending = await pendingRes.json();

        setStats({
          majors: Array.isArray(majors) ? majors.length : 0,
          courses: Array.isArray(courses) ? courses.length : 0,
          blueprints: Array.isArray(blueprints) ? blueprints.length : 0,
          pendingReviews: Array.isArray(pending) ? pending.length : 0,
        });
      } catch (e) {
        console.error("Failed to load stats", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const cards = [
    { label: "Majors", value: stats.majors, href: "/admin/majors", color: "bg-indigo-500" },
    { label: "Courses", value: stats.courses, href: "/admin/courses", color: "bg-green-500" },
    { label: "Blueprints", value: stats.blueprints, href: "/admin/reviews", color: "bg-blue-500" },
    { label: "Pending Reviews", value: stats.pendingReviews, href: "/admin/reviews", color: "bg-amber-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-xl font-bold text-white">{card.value}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
