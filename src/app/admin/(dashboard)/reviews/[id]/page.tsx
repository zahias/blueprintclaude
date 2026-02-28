"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS, BLOOM_LEVELS } from "@/lib/constants";
import QADashboard from "@/components/QADashboard";

interface Blueprint {
  id: string;
  accessToken: string;
  title: string;
  instructorName: string;
  examDate: string | null;
  duration: number | null;
  totalMarks: number;
  status: string;
  semester: string | null;
  academicYear: string | null;
  createdAt: string;
  course: {
    code: string;
    name: string;
    major: { name: string };
    los: { id: string; code: string; description: string }[];
  };
  topics: {
    id: string;
    topicId: string;
    questionCount: number;
    totalPoints: number;
    bloomRemember: number;
    bloomUnderstand: number;
    bloomApply: number;
    bloomAnalyze: number;
    bloomEvaluate: number;
    bloomCreate: number;
    topic: {
      name: string;
      los: { learningOutcomeId: string; learningOutcome: { code: string } }[];
    };
    questionTypes: { questionType: string; count: number }[];
  }[];
  comments: { id: string; content: string; createdAt: string; admin: { name: string } }[];
}

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const loadBlueprint = useCallback(async () => {
    const res = await fetch(`/api/blueprints/${id}`);
    if (res.ok) setBlueprint(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadBlueprint();
  }, [loadBlueprint]);

  async function handleReview(status: "APPROVED" | "REJECTED") {
    setSubmitting(true);
    await fetch(`/api/blueprints/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadBlueprint();
    setSubmitting(false);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/blueprints/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setComment("");
    loadBlueprint();
    setSubmitting(false);
  }

  function copyToken() {
    if (!blueprint) return;
    navigator.clipboard.writeText(blueprint.accessToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  async function downloadReviewPDF() {
    if (!blueprint) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(blueprint.title, 14, 22);
    doc.setFontSize(10);
    doc.text(`${blueprint.course.code} — ${blueprint.course.name} | ${blueprint.course.major.name}`, 14, 30);
    doc.text(`Instructor: ${blueprint.instructorName} | Total Marks: ${blueprint.totalMarks}`, 14, 36);
    if (blueprint.semester && blueprint.academicYear) {
      doc.text(`Semester: ${blueprint.semester} ${blueprint.academicYear}`, 14, 42);
    }
    doc.setFontSize(12);
    doc.setTextColor(blueprint.status === "APPROVED" ? 22 : blueprint.status === "REJECTED" ? 220 : 100,
      blueprint.status === "APPROVED" ? 163 : blueprint.status === "REJECTED" ? 38 : 100,
      blueprint.status === "APPROVED" ? 74 : blueprint.status === "REJECTED" ? 38 : 100);
    doc.text(`Status: ${BLUEPRINT_STATUS_LABELS[blueprint.status]}`, 14, 50);
    doc.setTextColor(0);

    // Topic breakdown table
    const bloomKeys = BLOOM_LEVELS.map((b) => b.key);
    const topicRows = blueprint.topics.map((bt) => [
      bt.topic.name,
      String(bt.questionCount),
      String(bt.totalPoints),
      ...bloomKeys.map((k) => String((bt as unknown as Record<string, number>)[k] || 0)),
      bt.questionTypes.map((qt) => `${qt.questionType}: ${qt.count}`).join(", "),
    ]);

    autoTable(doc, {
      startY: 58,
      head: [["Topic", "Qs", "Pts", ...BLOOM_LEVELS.map((b) => b.label.slice(0, 3)), "Q Types"]],
      body: topicRows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    // Comments section
    if (blueprint.comments.length > 0) {
      const finalY = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY) ?? 120;
      doc.setFontSize(12);
      doc.text("Review Comments", 14, finalY + 12);
      const commentRows = blueprint.comments.map((c) => [
        c.admin.name,
        new Date(c.createdAt).toLocaleString(),
        c.content,
      ]);
      autoTable(doc, {
        startY: finalY + 18,
        head: [["Reviewer", "Date", "Comment"]],
        body: commentRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    doc.save(`review-${blueprint.course.code}-${blueprint.title.replace(/\s+/g, "_")}.pdf`);
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!blueprint) return <div className="text-red-500">Blueprint not found</div>;

  return (
    <div>
      <Link href="/admin/reviews" className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block">
        &larr; Back to Reviews
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{blueprint.title}</h1>
            <p className="text-gray-500 mt-1">
              {blueprint.course.code} — {blueprint.course.name} • {blueprint.course.major.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              By: {blueprint.instructorName} • Total: {blueprint.totalMarks} pts
              {blueprint.duration && ` • ${blueprint.duration} min`}
              {blueprint.examDate && ` • ${new Date(blueprint.examDate).toLocaleDateString()}`}
              {blueprint.semester && blueprint.academicYear && ` • ${blueprint.semester} ${blueprint.academicYear}`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Token:</span>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{blueprint.accessToken}</code>
              <button onClick={copyToken} className="text-xs text-indigo-600 hover:text-indigo-800">
                {copiedToken ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${BLUEPRINT_STATUS_COLORS[blueprint.status]}`}>
            {BLUEPRINT_STATUS_LABELS[blueprint.status]}
          </span>
        </div>

        {/* Review actions */}
        <div className="mt-4 flex gap-3 pt-4 border-t border-gray-200">
          {blueprint.status === "SUBMITTED" && (
            <>
              <button
                onClick={() => handleReview("APPROVED")}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleReview("REJECTED")}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={downloadReviewPDF}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Download Review PDF
          </button>
        </div>
      </div>

      {/* Topic breakdown table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Topic Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Topic</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">LOs</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Qs</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Pts</th>
                {BLOOM_LEVELS.map((b) => (
                  <th key={b.key} className="text-center px-2 py-2 font-medium text-gray-500 text-xs">
                    {b.label.slice(0, 3)}
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-medium text-gray-500">Q Types</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blueprint.topics.map((bt) => (
                <tr key={bt.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{bt.topic.name}</td>
                  <td className="px-4 py-2 text-center">
                    {bt.topic.los.map((l) => (
                      <span key={l.learningOutcomeId} className="bg-indigo-100 text-indigo-700 text-xs font-mono px-1 rounded mr-1">
                        {l.learningOutcome.code}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-2 text-center">{bt.questionCount}</td>
                  <td className="px-4 py-2 text-center font-medium">{bt.totalPoints}</td>
                  {BLOOM_LEVELS.map((b) => (
                    <td key={b.key} className="px-2 py-2 text-center text-xs">
                      {(bt as unknown as Record<string, number>)[b.key] || 0}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {bt.questionTypes.map((qt) => `${qt.questionType}: ${qt.count}`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QA Dashboard */}
      <QADashboard blueprint={blueprint} />

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Comments</h2>

        <form onSubmit={handleComment} className="mb-4 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Add a comment..."
          />
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Post
          </button>
        </form>

        {blueprint.comments.length === 0 ? (
          <p className="text-gray-400 text-sm">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {blueprint.comments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{c.admin.name}</span>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
