"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";
import BlueprintQuestionReview from "@/components/BlueprintQuestionReview";
import { getQuestionFormatIssues, type BlueprintQuestionFormatEntry } from "@/lib/types";

interface Blueprint {
  id: string;
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
  }[];
  questionFormats: BlueprintQuestionFormatEntry[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    admin: { name: string } | null;
    coordinator: { name: string } | null;
  }[];
}

export default function CoordinatorReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBlueprint = useCallback(async () => {
    const res = await fetch(`/api/coordinator/blueprints/${id}`);
    if (res.ok) setBlueprint(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadBlueprint();
  }, [loadBlueprint]);

  const [revisionError, setRevisionError] = useState("");

  async function handleReview(status: "APPROVED" | "NEEDS_REVISION") {
    if (status === "NEEDS_REVISION" && (!blueprint || blueprint.comments.length === 0)) {
      setRevisionError("Please add a comment explaining what needs to be changed before requesting revision.");
      return;
    }
    setRevisionError("");
    setSubmitting(true);
    await fetch(`/api/coordinator/blueprints/${id}`, {
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
    await fetch(`/api/coordinator/blueprints/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setComment("");
    loadBlueprint();
    setSubmitting(false);
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!blueprint) return <div className="text-red-500">Blueprint not found</div>;
  const totalQuestions = blueprint.topics.reduce((sum, topic) => sum + topic.questionCount, 0);
  const matrixIssues = totalQuestions === blueprint.totalMarks
    ? []
    : [`Matrix has ${totalQuestions} questions but Exam Details says ${blueprint.totalMarks}`];
  const questionFormatIssues = getQuestionFormatIssues(blueprint.questionFormats, blueprint.totalMarks, true);
  const reviewIssues = [...matrixIssues, ...questionFormatIssues];

  return (
    <div>
      <Link href="/coordinator/blueprints" className="text-teal-600 hover:text-teal-800 text-sm mb-4 inline-block">
        &larr; Back to Blueprints
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
              By: {blueprint.instructorName} • {blueprint.totalMarks} questions
              {blueprint.semester && blueprint.academicYear && ` • ${blueprint.semester} ${blueprint.academicYear}`}
            </p>
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
                onClick={() => handleReview("NEEDS_REVISION")}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium disabled:opacity-50"
              >
                Needs Revision
              </button>
            </>
          )}
          {revisionError && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{revisionError}</p>
          )}
        </div>
      </div>

      <BlueprintQuestionReview
        examType={blueprint.title}
        courseLabel={`${blueprint.course.code} - ${blueprint.course.name}`}
        termLabel={blueprint.semester && blueprint.academicYear ? `${blueprint.semester} ${blueprint.academicYear}` : ""}
        totalQuestionsExpected={blueprint.totalMarks}
        courseLOs={blueprint.course.los}
        topics={blueprint.topics}
        questionFormats={blueprint.questionFormats}
        issues={reviewIssues}
      />

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Comments</h2>

        <form onSubmit={handleComment} className="mb-4 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            placeholder="Add a comment..."
          />
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition disabled:opacity-50"
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
                  <span className="font-medium text-sm text-gray-900">
                    {c.coordinator?.name || c.admin?.name || "Unknown"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.coordinator ? "Coordinator" : c.admin ? "Admin" : ""}
                  </span>
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
