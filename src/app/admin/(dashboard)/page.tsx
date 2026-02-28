"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  majors: number;
  courses: number;
  blueprints: number;
  pendingReviews: number;
}

interface AnalyticsHighlight {
  coursesWithCLOGaps: number;
  coursesWithTopicGaps: number;
  avgHOT: number;
  totalApproved: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ majors: 0, courses: 0, blueprints: 0, pendingReviews: 0 });
  const [highlights, setHighlights] = useState<AnalyticsHighlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [majorsRes, coursesRes, blueprintsRes, pendingRes, analyticsRes] = await Promise.all([
          fetch("/api/majors"),
          fetch("/api/courses"),
          fetch("/api/blueprints"),
          fetch("/api/blueprints?status=SUBMITTED"),
          fetch("/api/admin/analytics"),
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

        if (analyticsRes.ok) {
          const analytics = await analyticsRes.json();
          const courseStats = analytics.courseStats || [];
          const cloGaps = courseStats.filter((c: { cloCoverage: { percent: number } }) => c.cloCoverage.percent < 100).length;
          const topicGaps = courseStats.filter((c: { topicCoverage: { percent: number } }) => c.topicCoverage.percent < 100).length;
          const avgHOT = courseStats.length > 0
            ? Math.round(courseStats.reduce((s: number, c: { hotPercent: number }) => s + c.hotPercent, 0) / courseStats.length)
            : 0;
          setHighlights({
            coursesWithCLOGaps: cloGaps,
            coursesWithTopicGaps: topicGaps,
            avgHOT,
            totalApproved: courseStats.reduce((s: number, c: { blueprintCount: number }) => s + c.blueprintCount, 0),
          });
        }
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
        <>
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

          {/* Analytics Highlights */}
          {highlights && highlights.totalApproved > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Analytics Highlights</h2>
                <Link href="/admin/analytics" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  View Full Analytics →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-400 mb-1">Approved Blueprints</p>
                  <p className="text-2xl font-bold text-gray-900">{highlights.totalApproved}</p>
                </div>
                <div className={`rounded-xl border p-5 ${highlights.coursesWithCLOGaps > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <p className="text-xs text-gray-500 mb-1">Courses with CLO Gaps</p>
                  <p className={`text-2xl font-bold ${highlights.coursesWithCLOGaps > 0 ? "text-red-700" : "text-green-700"}`}>
                    {highlights.coursesWithCLOGaps}
                  </p>
                </div>
                <div className={`rounded-xl border p-5 ${highlights.coursesWithTopicGaps > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                  <p className="text-xs text-gray-500 mb-1">Courses with Topic Gaps</p>
                  <p className={`text-2xl font-bold ${highlights.coursesWithTopicGaps > 0 ? "text-amber-700" : "text-green-700"}`}>
                    {highlights.coursesWithTopicGaps}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-400 mb-1">Avg Higher-Order Thinking</p>
                  <p className={`text-2xl font-bold ${highlights.avgHOT >= 40 ? "text-green-700" : "text-amber-700"}`}>
                    {highlights.avgHOT}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
