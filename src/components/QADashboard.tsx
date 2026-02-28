"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BLOOM_LEVELS } from "@/lib/constants";

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

  const pointsMismatch = totalPoints !== blueprint.totalMarks && totalPoints > 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
        </div>
        <div className={`rounded-xl border p-4 ${pointsMismatch ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
          <p className="text-xs text-gray-400">Total Points</p>
          <p className={`text-2xl font-bold ${pointsMismatch ? "text-amber-700" : "text-gray-900"}`}>
            {totalPoints}
            <span className="text-sm font-normal text-gray-400"> / {blueprint.totalMarks}</span>
          </p>
          {pointsMismatch && <p className="text-xs text-amber-600 mt-1">⚠️ Mismatch</p>}
        </div>
      </div>

      {/* HOT/LOT bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-400 mb-2">Cognitive Balance</p>
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

      {/* Bloom Pie Chart */}
      {bloomData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-2">Bloom&apos;s Distribution</p>
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
          <p className="text-xs text-gray-400 mb-2">Points per Learning Outcome</p>
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

      {/* LO Coverage Table */}
      {loCoverage.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-2">Learning Outcome Coverage</p>
          <div className="space-y-1.5">
            {loCoverage.map((lo) => (
              <div
                key={lo.code}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  lo.covered ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <span className={`mt-0.5 ${lo.covered ? "text-green-600" : "text-red-500"}`}>
                  {lo.covered ? "✓" : "✗"}
                </span>
                <span className={`font-mono text-xs font-semibold ${lo.covered ? "text-green-700" : "text-red-700"}`}>
                  {lo.code}
                </span>
                <span className="text-gray-600 text-xs flex-1">{lo.description}</span>
                {lo.covered && <span className="text-xs text-gray-400">{lo.points} pts</span>}
              </div>
            ))}
          </div>
          {loCoverage.some((lo) => !lo.covered) && (
            <p className="text-xs text-red-500 mt-2">
              ⚠️ {loCoverage.filter((lo) => !lo.covered).length} learning outcome(s) not assessed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
