"use client";

import { BLOOM_LEVELS } from "@/lib/constants";
import type { BlueprintTopicEntry } from "@/lib/types";

interface TopicLOData {
  learningOutcomeId: string;
  learningOutcome: { code: string; description?: string };
}

interface TopicData {
  id: string;
  name: string;
  description: string | null;
  los: TopicLOData[];
}

interface BlueprintBloomMatrixProps {
  topics: TopicData[];
  entries: BlueprintTopicEntry[];
  onChange: (entries: BlueprintTopicEntry[]) => void;
  disabled?: boolean;
}

const bloomKeys = BLOOM_LEVELS.map((level) => level.key) as Array<keyof Pick<
  BlueprintTopicEntry,
  "bloomRemember" | "bloomUnderstand" | "bloomApply" | "bloomAnalyze" | "bloomEvaluate" | "bloomCreate"
>>;

function getQuestionTotal(entry: BlueprintTopicEntry) {
  return bloomKeys.reduce((sum, key) => sum + (Number(entry[key]) || 0), 0);
}

export default function BlueprintBloomMatrix({ topics, entries, onChange, disabled = false }: BlueprintBloomMatrixProps) {
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const orderedEntries = topics
    .map((topic) => entries.find((entry) => entry.topicId === topic.id))
    .filter(Boolean) as BlueprintTopicEntry[];
  const totalQuestions = orderedEntries.reduce((sum, entry) => sum + getQuestionTotal(entry), 0);

  function updateEntry(topicId: string, partial: Partial<BlueprintTopicEntry>) {
    onChange(entries.map((entry) => {
      if (entry.topicId !== topicId) return entry;
      const next = { ...entry, ...partial, bloomPreset: "CUSTOM" as const };
      const questionCount = getQuestionTotal(next);
      return { ...next, questionCount, totalPoints: questionCount };
    }));
  }

  function removeEntry(topicId: string) {
    onChange(entries.filter((entry) => entry.topicId !== topicId));
  }

  if (orderedEntries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
        Select at least one topic before filling the Bloom matrix.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Bloom Matrix</h3>
            <p className="mt-1 text-sm text-gray-500">Enter the number of questions for each topic and Bloom level.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">{totalQuestions} questions</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-64 px-3 py-3 text-left font-semibold text-gray-600">Topic</th>
              {BLOOM_LEVELS.map((level) => (
                <th key={level.key} className="px-2 py-3 text-center font-semibold text-gray-600">{level.label}</th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-gray-600">Total Questions</th>
              {!disabled && <th className="w-20 px-3 py-3 text-right font-semibold text-gray-600">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orderedEntries.map((entry) => {
              const topic = topicById.get(entry.topicId);
              const rowTotal = getQuestionTotal(entry);
              return (
                <tr key={entry.topicId}>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium text-gray-900">{topic?.name || "Selected topic"}</p>
                    {topic && topic.los.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {topic.los.map((lo) => (
                          <span key={lo.learningOutcomeId} className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-[11px] text-green-700">
                            {lo.learningOutcome.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {BLOOM_LEVELS.map((level) => {
                    const key = level.key as (typeof bloomKeys)[number];
                    return (
                      <td key={level.key} className="px-2 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={entry[key] || ""}
                          onChange={(event) => updateEntry(entry.topicId, { [key]: parseInt(event.target.value) || 0 })}
                          disabled={disabled}
                          aria-label={`${topic?.name || "Topic"} ${level.label} questions`}
                          className="w-20 rounded border border-gray-300 px-2 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                          placeholder="0"
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center align-top">
                    <span className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 font-semibold ${
                      rowTotal > 0 ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {rowTotal}
                    </span>
                  </td>
                  {!disabled && (
                    <td className="px-3 py-3 text-right align-top">
                      <button type="button" onClick={() => removeEntry(entry.topicId)} className="text-xs font-medium text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
