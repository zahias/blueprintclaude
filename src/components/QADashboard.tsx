"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BLOOM_LEVELS } from "@/lib/constants";
import HelpTooltip from "@/components/HelpTooltip";

interface TopicEntry {
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
}

interface QADashboardProps {
  blueprint: {
    totalMarks: number;
    course?: {
      los: { id: string; code: string; description: string }[];
    };
    topics: TopicEntry[];
  };
}

export default function QADashboard({ blueprint }: QADashboardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { bloomData, loData, loCoverage, totalQuestions, highOrderPercent, lowOrderPercent, readinessIssues } = useMemo(() => {
    const topics = blueprint.topics || [];
    const courseLOs = blueprint.course?.los || [];

    // Bloom aggregation
    const bloomAgg: Record<string, number> = {};
    BLOOM_LEVELS.forEach((b) => (bloomAgg[b.key] = 0));
    topics.forEach((t) => {
      BLOOM_LEVELS.forEach((b) => {
        bloomAgg[b.key] += (t as unknown as Record<string, number>)[b.key] || 0;
      });
    });

    const bloomData = BLOOM_LEVELS.map((b) => ({
      name: b.label,
      value: bloomAgg[b.key],
      color: b.color,
    })).filter((d) => d.value > 0);

    // LO coverage: derive from topic -> LO links using question counts.
    const loQuestionMap: Record<string, number> = {};
    const loCoveredSet = new Set<string>();

    topics.forEach((t) => {
      const topicLOs = t.topic.los || [];
      const questionsPerLO = topicLOs.length > 0 ? t.questionCount / topicLOs.length : 0;
      topicLOs.forEach((tl) => {
        loCoveredSet.add(tl.learningOutcomeId);
        loQuestionMap[tl.learningOutcomeId] = (loQuestionMap[tl.learningOutcomeId] || 0) + questionsPerLO;
      });
    });

    const loData = courseLOs.map((lo) => ({
      code: lo.code,
      questions: Math.round((loQuestionMap[lo.id] || 0) * 10) / 10,
    }));

    const loCoverage = courseLOs.map((lo) => ({
      code: lo.code,
      description: lo.description,
      covered: loCoveredSet.has(lo.id),
      questions: Math.round((loQuestionMap[lo.id] || 0) * 10) / 10,
    }));

    const totalQuestions = topics.reduce((s, t) => s + t.questionCount, 0);

    const lowOrder = bloomAgg.bloomRemember + bloomAgg.bloomUnderstand + bloomAgg.bloomApply;
    const highOrder = bloomAgg.bloomAnalyze + bloomAgg.bloomEvaluate + bloomAgg.bloomCreate;
    const total = lowOrder + highOrder;
    const lowOrderPercent = total > 0 ? Math.round((lowOrder / total) * 100) : 0;
    const highOrderPercent = total > 0 ? Math.round((highOrder / total) * 100) : 0;
    const readinessIssues: string[] = [];

    if (topics.length === 0) {
      readinessIssues.push("Add at least one topic.");
    }
    if (blueprint.totalMarks > 0 && totalQuestions !== blueprint.totalMarks) {
      readinessIssues.push(`Matrix has ${totalQuestions} questions but Exam Details says ${blueprint.totalMarks}`);
    }
    topics.forEach((topic, index) => {
      const bloomTotal = BLOOM_LEVELS.reduce(
        (sum, b) => sum + ((topic as unknown as Record<string, number>)[b.key] || 0),
        0
      );
      if (topic.questionCount > 0 && bloomTotal !== topic.questionCount) {
        readinessIssues.push(`Topic ${index + 1}: Bloom total must equal questions.`);
      }
    });

    return { bloomData, loData, loCoverage, totalQuestions, highOrderPercent, lowOrderPercent, readinessIssues };
  }, [blueprint]);

  const ready = readinessIssues.length === 0;

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${ready ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <p className={`text-sm font-semibold ${ready ? "text-green-800" : "text-amber-800"}`}>
          {ready ? "Ready for review" : "Not ready yet"}
        </p>
        <p className={`mt-1 text-xs ${ready ? "text-green-700" : "text-amber-700"}`}>
          {ready
            ? "Totals and distributions are aligned."
            : readinessIssues[0]}
        </p>
        {!ready && readinessIssues.length > 1 && (
          <p className="mt-2 text-xs text-amber-600">{readinessIssues.length - 1} more issue{readinessIssues.length === 2 ? "" : "s"} to resolve</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Target Questions</p>
          <p className="text-2xl font-bold text-gray-900">
            {blueprint.totalMarks}
          </p>
        </div>
      </div>

      {/* Cognitive balance bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-1 mb-2">
          <p className="text-xs font-medium text-gray-500">Cognitive Balance</p>
          <HelpTooltip text="Low Order Thinking: Remember, Understand, Apply. High Order Thinking: Analyze, Evaluate, Create." />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500 w-28">Low Order {lowOrderPercent}%</span>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${lowOrderPercent}%` }}
            />
            <div
              className="bg-indigo-500 h-full transition-all"
              style={{ width: `${highOrderPercent}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-28 text-right">High Order {highOrderPercent}%</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Remember • Understand • Apply</span>
          <span>Analyze • Evaluate • Create</span>
        </div>
      </div>

      {/* LO Coverage — compact inline */}
      {loCoverage.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Learning Outcome Coverage</p>
          <div className="flex flex-wrap gap-1.5">
            {loCoverage.map((lo) => (
              <span
                key={lo.code}
                title={lo.description}
                className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-md ${
                  lo.covered
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {lo.covered ? "✓" : "✗"} {lo.code}
                {lo.covered && lo.questions > 0 && (
                  <span className="text-green-500 font-sans text-[10px]">{lo.questions}q</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analytics — expandable */}
      {(bloomData.length > 0 || loData.length > 0) && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-indigo-600 transition"
          >
            {showDetails ? "Hide" : "Show"} Detailed Charts
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDetails && (
            <div className="space-y-3 mt-1">
              {/* Bloom Pie Chart */}
              {bloomData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Bloom&apos;s Distribution</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={bloomData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {bloomData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* LO Points Bar Chart */}
              {loData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Questions per Learning Outcome</p>
                  <ResponsiveContainer width="100%" height={Math.max(150, loData.length * 35)}>
                    <BarChart data={loData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="code" tick={{ fontSize: 10 }} width={40} />
                      <Tooltip />
                      <Bar dataKey="questions" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
