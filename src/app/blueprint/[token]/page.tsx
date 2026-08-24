"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { BLUEPRINT_STATUS_COLORS, BLUEPRINT_STATUS_LABELS } from "@/lib/constants";
import BlueprintQuestionReview from "@/components/BlueprintQuestionReview";

interface Blueprint {
  id: string;
  accessToken: string;
  title: string;
  instructorName: string;
  examDate: string | null;
  duration: number | null;
  totalMarks: number;
  status: string;
  createdAt: string;
  course: {
    code: string;
    name: string;
    major: { name: string };
    los: { id: string; code: string; description: string }[];
    topics: {
      id: string;
      name: string;
      los: { learningOutcomeId: string; learningOutcome: { code: string } }[];
    }[];
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
  comments: { id: string; content: string; createdAt: string; admin: { name: string } | null; coordinator: { name: string } | null }[];
}

export default function ViewBlueprintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/blueprints/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setBlueprint)
      .catch(() => setError("Blueprint not found. Check your access token."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }
  if (!blueprint) return null;

  const totalQuestions = blueprint.topics.reduce((sum, t) => sum + t.questionCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="font-bold text-gray-900">Blueprint Viewer</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${BLUEPRINT_STATUS_COLORS[blueprint.status]}`}>
              {BLUEPRINT_STATUS_LABELS[blueprint.status]}
            </span>
            <Link
              href={`/blueprint/${token}/export`}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
            >
              Export PDF
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{blueprint.title}</h2>
          <p className="text-gray-500 mt-1">
            {blueprint.course.code} — {blueprint.course.name} • {blueprint.course.major.name}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-gray-400">Instructor</p>
              <p className="font-medium text-gray-900">{blueprint.instructorName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Target Questions</p>
              <p className="font-medium text-gray-900">{blueprint.totalMarks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Questions</p>
              <p className="font-medium text-gray-900">{totalQuestions}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Exam Type</p>
              <p className="font-medium text-gray-900">{blueprint.title}</p>
            </div>
          </div>

          {/* Access token reminder */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Access Token (bookmark this to return later):</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 select-all">{blueprint.accessToken}</code>
          </div>
        </div>

        <BlueprintQuestionReview
          examType={blueprint.title}
          courseLabel={`${blueprint.course.code} - ${blueprint.course.name}`}
          termLabel=""
          totalQuestionsExpected={blueprint.totalMarks}
          courseLOs={blueprint.course.los}
          topics={blueprint.topics}
          issues={totalQuestions === blueprint.totalMarks ? [] : [`Matrix has ${totalQuestions} questions but Exam Details says ${blueprint.totalMarks}`]}
        />

        {/* Comments (if any) */}
        {blueprint.comments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Comments</h3>
            <div className="space-y-3">
              {blueprint.comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{c.coordinator?.name || c.admin?.name || "Reviewer"}</span>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
