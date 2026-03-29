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
  questionTypes: { questionType: string; count: number }[];
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

  const { bloomData, loData, loCoverage, totalQuestions, totalPoints, hotPercent, lotPercent } = useMemo(() => {
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

    // LO coverage: derive from topic → LO links
    const loPointsMap: Record<string, number> = {};
    const loCoveredSet = new Set<string>();

    topics.forEach((t) => {
      const topicLOs = t.topic.los || [];
      const pointsPerLO = topicLOs.length > 0 ? t.totalPoints / topicLOs.length : 0;
      topicLOs.forEach((tl) => {
        loCoveredSet.add(tl.learningOutcomeId);
        loPointsMap[tl.learningOutcomeId] = (loPointsMap[tl.learningOutcomeId] || 0) + pointsPerLO;
      });
    });

    const loData = courseLOs.map((lo) => ({
      code: lo.code,
      points: Math.round((loPointsMap[lo.id] || 0) * 10) / 10,
    }));

    const loCoverage = courseLOs.map((lo) => ({
      code: lo.code,
      description: lo.description,
      covered: loCoveredSet.has(lo.id),
      points: Math.round((loPointsMap[lo.id] || 0) * 10) / 10,
    }));

    const totalQuestions = topics.reduce((s, t) => s + t.questionCount, 0);
    const totalPoints = topics.reduce((s, t) => s + t.totalPoints, 0);

    // HOT/LOT calculation
    const lot = bloomAgg.bloomRemember + bloomAgg.bloomUnderstand + bloomAgg.bloomApply;
    const hot = bloomAgg.bloomAnalyze + bloomAgg.bloomEvaluate + bloomAgg.bloomCreate;
    const total = lot + hot;
    const lotPercent = total > 0 ? Math.round((lot / total) * 100) : 0;
    const hotPercent = total > 0 ? Math.round((hot / total) * 100) : 0;

    return { bloomData, loData, loCoverage, totalQuestions, totalPoints, hotPercent, lotPercent };
  }, [blueprint]);

  return (
    <div className="space-y-3">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Total Points</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalPoints}
            <span className="text-sm font-normal text-gray-400"> / {blueprint.totalMarks}</span>
          </p>
        </div>
      </div>

      {/* HOT/LOT bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-1 mb-2">
          <p className="text-xs font-medium text-gray-500">Cognitive Balance</p>
          <HelpTooltip text="LOT (Lower-Order Thinking): Remember, Understand, Apply. HOT (Higher-Order Thinking): Analyze, Evaluate, Create. A good exam typically has 40-60% HOT questions." />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500 w-20">LOT {lotPercent}%</span>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${lotPercent}%` }}
            />
            <div
              className="bg-indigo-500 h-full transition-all"
              style={{ width: `${hotPercent}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-20 text-right">HOT {hotPercent}%</span>
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
                {lo.covered && lo.points > 0 && (
                  <span className="text-green-500 font-sans text-[10px]">{lo.points}pt</span>
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
                  <p className="text-xs font-medium text-gray-500 mb-2">Points per Learning Outcome</p>
                  <ResponsiveContainer width="100%" height={Math.max(150, loData.length * 35)}>
                    <BarChart data={loData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="code" tick={{ fontSize: 10 }} width={40} />
                      <Tooltip />
                      <Bar dataKey="points" fill="#6366f1" radius={[0, 4, 4, 0]} />
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
