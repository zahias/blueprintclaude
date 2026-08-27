"use client";

import { BLOOM_LEVELS } from "@/lib/constants";
import {
  type BlueprintQuestionFormatEntry,
  type BlueprintTopicEntry,
  getBloomInsights,
  getQuestionFormatInsights,
} from "@/lib/types";

interface TopicLOData {
  learningOutcomeId: string;
  learningOutcome: { code: string; description?: string };
}

interface TopicData {
  id?: string;
  name: string;
  los: TopicLOData[];
}

interface ReviewTopic extends BlueprintTopicEntry {
  topic: TopicData;
}

interface CourseLO {
  id: string;
  code: string;
  description: string;
}

interface BlueprintQuestionReviewProps {
  examType: string;
  courseLabel: string;
  termLabel: string;
  totalQuestionsExpected: number;
  courseLOs: CourseLO[];
  topics: ReviewTopic[];
  questionFormats?: BlueprintQuestionFormatEntry[];
  issues?: string[];
}

const lowOrderKeys = ["bloomRemember", "bloomUnderstand", "bloomApply"] as const;
const highOrderKeys = ["bloomAnalyze", "bloomEvaluate", "bloomCreate"] as const;
const bloomKeys = BLOOM_LEVELS.map((level) => level.key) as Array<keyof BlueprintTopicEntry>;

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export default function BlueprintQuestionReview({
  examType,
  courseLabel,
  termLabel,
  totalQuestionsExpected,
  courseLOs,
  topics,
  questionFormats = [],
  issues = [],
}: BlueprintQuestionReviewProps) {
  const matrixQuestionTotal = topics.reduce((sum, topic) => sum + topic.questionCount, 0);
  const lowOrderQuestions = topics.reduce(
    (sum, topic) => sum + lowOrderKeys.reduce((inner, key) => inner + (Number(topic[key]) || 0), 0),
    0
  );
  const highOrderQuestions = topics.reduce(
    (sum, topic) => sum + highOrderKeys.reduce((inner, key) => inner + (Number(topic[key]) || 0), 0),
    0
  );
  const lowOrderPercent = pct(lowOrderQuestions, matrixQuestionTotal);
  const highOrderPercent = pct(highOrderQuestions, matrixQuestionTotal);
  const ready = issues.length === 0;
  const formatInsights = getQuestionFormatInsights(questionFormats, highOrderQuestions, totalQuestionsExpected);
  const bloomInsights = getBloomInsights(lowOrderQuestions, highOrderQuestions, matrixQuestionTotal);

  const bloomDistribution = BLOOM_LEVELS.map((level) => {
    const count = topics.reduce((sum, topic) => sum + (Number(topic[level.key as keyof BlueprintTopicEntry]) || 0), 0);
    return { ...level, count, percent: pct(count, matrixQuestionTotal) };
  });

  const cloQuestionMap = new Map<string, number>();
  const cloCovered = new Set<string>();
  topics.forEach((topic) => {
    const linkedLOs = topic.topic.los || [];
    const questionsPerLO = linkedLOs.length > 0 ? topic.questionCount / linkedLOs.length : 0;
    linkedLOs.forEach((lo) => {
      cloCovered.add(lo.learningOutcomeId);
      cloQuestionMap.set(lo.learningOutcomeId, (cloQuestionMap.get(lo.learningOutcomeId) || 0) + questionsPerLO);
    });
  });

  const cloDistribution = courseLOs.map((lo) => ({
    ...lo,
    questions: Math.round((cloQuestionMap.get(lo.id) || 0) * 10) / 10,
    covered: cloCovered.has(lo.id),
  }));
  const activeQuestionFormats = questionFormats.filter((format) => format.questionCount > 0 || format.gradeWeight > 0);
  const formatQuestionTotal = activeQuestionFormats.reduce((sum, format) => sum + format.questionCount, 0);
  const formatWeightTotal = Math.round(activeQuestionFormats.reduce((sum, format) => sum + format.gradeWeight, 0) * 100) / 100;
  const closedQuestions = activeQuestionFormats
    .filter((format) => format.group === "CLOSED_ENDED")
    .reduce((sum, format) => sum + format.questionCount, 0);
  const openQuestions = activeQuestionFormats
    .filter((format) => format.group === "OPEN_ENDED")
    .reduce((sum, format) => sum + format.questionCount, 0);
  const closedWeight = activeQuestionFormats
    .filter((format) => format.group === "CLOSED_ENDED")
    .reduce((sum, format) => sum + format.gradeWeight, 0);
  const openWeight = activeQuestionFormats
    .filter((format) => format.group === "OPEN_ENDED")
    .reduce((sum, format) => sum + format.gradeWeight, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Blueprint</h2>
            <p className="mt-1 text-sm text-gray-500">
              {examType} • {courseLabel}{termLabel ? ` • ${termLabel}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Target</p>
              <p className="font-bold text-gray-900">{totalQuestionsExpected}</p>
            </div>
            <div className={`rounded-lg px-3 py-2 ${matrixQuestionTotal === totalQuestionsExpected ? "bg-green-50" : "bg-amber-50"}`}>
              <p className="text-xs text-gray-500">Matrix</p>
              <p className="font-bold text-gray-900">{matrixQuestionTotal}</p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Topics</p>
              <p className="font-bold text-gray-900">{topics.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`rounded-xl border p-4 ${ready ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        <p className={`font-semibold ${ready ? "text-green-800" : "text-amber-800"}`}>
          {ready ? "Ready to submit" : "Fix these issues to submit"}
        </p>
        {ready ? (
          <p className="mt-1 text-sm text-green-700">The matrix question total matches Exam Details.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
            {issues.map((issue, index) => <li key={index}>{issue}</li>)}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Cognitive Balance</h3>
          <p className="mt-1 text-sm text-gray-500">Question split across lower and higher cognitive demand.</p>
          <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-amber-400" style={{ width: `${lowOrderPercent}%` }} />
            <div className="bg-indigo-500" style={{ width: `${highOrderPercent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="font-semibold text-amber-800">Low Order Thinking</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{lowOrderPercent}%</p>
              <p className="text-xs text-amber-700">{lowOrderQuestions} questions: Remember, Understand, Apply</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-800">High Order Thinking</p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{highOrderPercent}%</p>
              <p className="text-xs text-indigo-700">{highOrderQuestions} questions: Analyze, Evaluate, Create</p>
            </div>
          </div>
          {bloomInsights.length > 0 && (
            <div className="mt-4 space-y-2">
              {bloomInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{insight.title}</p>
                  <p className="mt-1 text-sm text-amber-800">{insight.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Bloom Distribution</h3>
          <div className="mt-4 space-y-2">
            {bloomDistribution.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex justify-between text-xs text-gray-600">
                  <span>{item.label}</span>
                  <span>{item.count} questions</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Question Format Balance</h3>
        <p className="mt-1 text-sm text-gray-500">Closed-ended and open-ended mix by question count and grade weight.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Format Questions</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatQuestionTotal}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Format Weight</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatWeightTotal}%</p>
          </div>
          <div className="rounded-lg bg-sky-50 p-3">
            <p className="font-semibold text-sky-800">Closed-ended</p>
            <p className="mt-1 text-2xl font-bold text-sky-900">{pct(closedQuestions, formatQuestionTotal)}%</p>
            <p className="text-xs text-sky-700">{closedQuestions} questions, {closedWeight}% grade weight</p>
          </div>
          <div className="rounded-lg bg-indigo-50 p-3">
            <p className="font-semibold text-indigo-800">Open-ended</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">{pct(openQuestions, formatQuestionTotal)}%</p>
            <p className="text-xs text-indigo-700">{openQuestions} questions, {openWeight}% grade weight</p>
          </div>
        </div>

        {formatInsights.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">Question format insights</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {formatInsights.map((insight, index) => (
                <div key={`${insight.title}-${index}`} className="rounded-lg bg-white/70 p-3">
                  <p className="text-sm font-semibold text-amber-900">{insight.title}</p>
                  <p className="mt-1 text-sm text-amber-800">{insight.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeQuestionFormats.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Format</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Group</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Questions</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Grade Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeQuestionFormats.map((format) => (
                  <tr key={format.formatType}>
                    <td className="px-3 py-2 font-medium text-gray-900">{format.label || format.formatType.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2 text-gray-600">{format.group === "CLOSED_ENDED" ? "Closed-ended" : "Open-ended"}</td>
                    <td className="px-3 py-2 text-center">{format.questionCount}</td>
                    <td className="px-3 py-2 text-center">{format.gradeWeight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cloDistribution.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">CLO Distribution</h3>
          <p className="mt-1 text-sm text-gray-500">Estimated question distribution by course learning outcome.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {cloDistribution.map((lo) => (
              <div key={lo.id} className={`rounded-lg border px-3 py-2 ${lo.covered ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`font-mono text-sm font-semibold ${lo.covered ? "text-green-700" : "text-gray-500"}`}>{lo.code}</span>
                  <span className="text-sm font-semibold text-gray-900">{lo.questions} q</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{lo.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Topic Summary</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Topic</th>
                {BLOOM_LEVELS.map((level) => <th key={level.key} className="px-2 py-2 text-center font-medium text-gray-500">{level.label}</th>)}
                <th className="px-3 py-2 text-center font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topics.map((topic) => (
                <tr key={topic.topicId}>
                  <td className="px-3 py-2 font-medium text-gray-900">{topic.topic.name}</td>
                  {bloomKeys.map((key) => <td key={key} className="px-2 py-2 text-center">{Number(topic[key]) || 0}</td>)}
                  <td className="px-3 py-2 text-center font-semibold text-gray-900">{topic.questionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
