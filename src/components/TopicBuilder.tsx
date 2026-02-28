"use client";

import { BLOOM_LEVELS, QUESTION_TYPES } from "@/lib/constants";
import type { BlueprintTopicEntry } from "@/lib/types";
import HelpTooltip from "@/components/HelpTooltip";

interface TopicLOData {
  learningOutcomeId: string;
  learningOutcome: { code: string; description: string };
}

interface TopicData {
  id: string;
  name: string;
  description: string | null;
  los: TopicLOData[];
}

interface TopicBuilderProps {
  topics: TopicData[];
  entries: BlueprintTopicEntry[];
  onChange: (entries: BlueprintTopicEntry[]) => void;
}

function emptyEntry(): BlueprintTopicEntry {
  return {
    topicId: "",
    questionCount: 0,
    totalPoints: 0,
    bloomRemember: 0,
    bloomUnderstand: 0,
    bloomApply: 0,
    bloomAnalyze: 0,
    bloomEvaluate: 0,
    bloomCreate: 0,
    questionTypes: [],
  };
}

export default function TopicBuilder({ topics, entries, onChange }: TopicBuilderProps) {
  function addEntry() {
    onChange([...entries, emptyEntry()]);
  }

  function updateEntry(index: number, partial: Partial<BlueprintTopicEntry>) {
    const updated = entries.map((e, i) => (i === index ? { ...e, ...partial } : e));
    onChange(updated);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function updateQType(entryIndex: number, qType: string, count: number) {
    const entry = entries[entryIndex];
    const existing = entry.questionTypes.filter((qt) => qt.questionType !== qType);
    if (count > 0) {
      existing.push({ questionType: qType, count });
    }
    updateEntry(entryIndex, { questionTypes: existing });
  }

  function getBloomSum(entry: BlueprintTopicEntry) {
    return (
      entry.bloomRemember +
      entry.bloomUnderstand +
      entry.bloomApply +
      entry.bloomAnalyze +
      entry.bloomEvaluate +
      entry.bloomCreate
    );
  }

  function getQTypeSum(entry: BlueprintTopicEntry) {
    return entry.questionTypes.reduce((sum, qt) => sum + qt.count, 0);
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200 border-dashed">
          <p className="text-gray-400 mb-3">No topics added yet.</p>
          <button
            onClick={addEntry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            + Add First Topic
          </button>
        </div>
      )}

      {entries.map((entry, index) => {
        const selectedTopic = topics.find((t) => t.id === entry.topicId);
        const bloomSum = getBloomSum(entry);
        const qTypeSum = getQTypeSum(entry);
        const bloomValid = entry.questionCount === 0 || bloomSum === entry.questionCount;
        const qTypeValid = entry.questionCount === 0 || qTypeSum === entry.questionCount;

        return (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-5">
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-gray-900">
                  {selectedTopic ? selectedTopic.name : "Select a topic"}
                </h3>
              </div>
              <button
                onClick={() => removeEntry(index)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Topic select + basic inputs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
                <select
                  value={entry.topicId}
                  onChange={(e) => updateEntry(index, { topicId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select topic...</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.los.map((l) => l.learningOutcome.code).join(", ")})
                    </option>
                  ))}
                </select>
                {selectedTopic && selectedTopic.los.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {selectedTopic.los.map((l) => (
                      <span key={l.learningOutcomeId} className="bg-green-100 text-green-700 text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {l.learningOutcome.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1"># of Questions</label>
                <input
                  type="number"
                  min={0}
                  value={entry.questionCount || ""}
                  onChange={(e) => updateEntry(index, { questionCount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Total Points</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={entry.totalPoints || ""}
                  onChange={(e) => updateEntry(index, { totalPoints: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Bloom's Distribution */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Bloom&apos;s Distribution
                  </label>
                  <HelpTooltip text="Distribute your questions across Bloom's cognitive levels. The total must equal the number of questions." />
                </div>
                <span className={`text-xs ${bloomValid ? "text-green-600" : "text-red-500 font-medium"}`}>
                  {bloomSum}/{entry.questionCount} questions
                  {!bloomValid && " ⚠️"}
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {BLOOM_LEVELS.map((bloom) => {
                  const key = bloom.key as keyof BlueprintTopicEntry;
                  return (
                    <div key={bloom.key}>
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <label className="block text-[10px] text-gray-500">{bloom.label}</label>
                        <HelpTooltip text={bloom.description} />
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={(entry[key] as number) || ""}
                        onChange={(e) =>
                          updateEntry(index, { [bloom.key]: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="0"
                      />
                      <div
                        className="h-1 rounded-full mt-1"
                        style={{ backgroundColor: bloom.color, opacity: 0.3 + ((entry[key] as number) / Math.max(entry.questionCount, 1)) * 0.7 }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Types */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Question Types
                  </label>
                  <HelpTooltip text="Specify how many questions of each type. The total must equal the number of questions." />
                </div>
                <span className={`text-xs ${qTypeValid ? "text-green-600" : "text-red-500 font-medium"}`}>
                  {qTypeSum}/{entry.questionCount} questions
                  {!qTypeValid && " ⚠️"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {QUESTION_TYPES.map((qt) => {
                  const existing = entry.questionTypes.find((x) => x.questionType === qt.value);
                  return (
                    <div key={qt.value} className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5 flex-1">
                        <label className="text-[10px] text-gray-500 whitespace-nowrap">{qt.label}</label>
                        <HelpTooltip text={qt.description} />
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={existing?.count || ""}
                        onChange={(e) => updateQType(index, qt.value, parseInt(e.target.value) || 0)}
                        className="w-14 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {entries.length > 0 && (
        <button
          onClick={addEntry}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition text-sm font-medium"
        >
          + Add Another Topic
        </button>
      )}
    </div>
  );
}
