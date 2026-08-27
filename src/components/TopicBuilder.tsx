"use client";

import { useState } from "react";
import { BLOOM_LEVELS } from "@/lib/constants";
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

type BloomPreset = NonNullable<BlueprintTopicEntry["bloomPreset"]>;

const PRESETS: { value: BloomPreset; label: string; description: string; weights: number[] | null }[] = [
  { value: "BALANCED", label: "Balanced", description: "Evenly spreads questions across all Bloom levels.", weights: [1, 1, 1, 1, 1, 1] },
  { value: "FOUNDATIONAL", label: "Foundational", description: "Emphasizes Remember, Understand, and Apply.", weights: [3, 3, 2, 1, 1, 0] },
  { value: "HIGHER_ORDER", label: "Higher Order", description: "Emphasizes Analyze, Evaluate, and Create.", weights: [0, 1, 1, 2, 3, 3] },
  { value: "CUSTOM", label: "Custom", description: "Manual Bloom counts.", weights: null },
];

function distributeWeighted(total: number, weights: number[]) {
  if (total <= 0) return [0, 0, 0, 0, 0, 0];
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) return [0, 0, 0, 0, 0, total];

  const raw = weights.map((weight) => (total * weight) / weightTotal);
  const values = raw.map(Math.floor);
  let remaining = total - values.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const item of order) {
    if (remaining <= 0) break;
    values[item.index]++;
    remaining--;
  }

  return values;
}

function bloomValues(questionCount: number, preset: BloomPreset) {
  const selected = PRESETS.find((item) => item.value === preset) || PRESETS[0];
  const values = distributeWeighted(questionCount, selected.weights || PRESETS[0].weights!);
  return {
    bloomRemember: values[0],
    bloomUnderstand: values[1],
    bloomApply: values[2],
    bloomAnalyze: values[3],
    bloomEvaluate: values[4],
    bloomCreate: values[5],
  };
}

function entryForTopic(topicId: string): BlueprintTopicEntry {
  return {
    topicId,
    questionCount: 0,
    totalPoints: 0,
    bloomPreset: "BALANCED",
    ...bloomValues(0, "BALANCED"),
  };
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

function BloomDetails({
  entry,
  onChange,
}: {
  entry: BlueprintTopicEntry;
  onChange: (partial: Partial<BlueprintTopicEntry>) => void;
}) {
  const [open, setOpen] = useState(false);
  const bloomSum = getBloomSum(entry);
  const valid = entry.questionCount === 0 || bloomSum === entry.questionCount;
  const remaining = entry.questionCount - bloomSum;

  return (
    <div className={`rounded-xl border ${valid ? "border-gray-200" : "border-red-300 bg-red-50/30"}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50/60 transition"
      >
        <span className="text-xs font-medium text-gray-700">Advanced Bloom details</span>
        <div className="flex items-center gap-2">
          {remaining !== 0 && (
            <span className={`text-[11px] font-medium ${remaining > 0 ? "text-amber-600" : "text-red-600"}`}>
              {remaining > 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
            </span>
          )}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {entry.questionCount > 0 ? `${bloomSum}/${entry.questionCount}` : "—"}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {BLOOM_LEVELS.map((bloom) => {
              const key = bloom.key as keyof BlueprintTopicEntry;
              const value = entry[key] as number;
              return (
                <div key={bloom.key}>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                    {bloom.label}
                    <HelpTooltip text={bloom.description} />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={value || ""}
                    onChange={(event) => onChange({ [bloom.key]: parseInt(event.target.value) || 0, bloomPreset: "CUSTOM" })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    placeholder="0"
                  />
                  <div
                    className="h-1 rounded-full mt-1"
                    style={{ backgroundColor: bloom.color, opacity: 0.3 + (value / Math.max(entry.questionCount, 1)) * 0.7 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopicBuilder({ topics, entries, onChange }: TopicBuilderProps) {
  const selectedIds = new Set(entries.map((entry) => entry.topicId));

  function syncTopics(topicId: string, selected: boolean) {
    if (selected) {
      const next = [...entries, entryForTopic(topicId)];
      onChange(topics.map((topic) => next.find((entry) => entry.topicId === topic.id)).filter(Boolean) as BlueprintTopicEntry[]);
    } else {
      onChange(entries.filter((entry) => entry.topicId !== topicId));
    }
  }

  function updateEntry(topicId: string, partial: Partial<BlueprintTopicEntry>) {
    onChange(entries.map((entry) => (entry.topicId === topicId ? { ...entry, ...partial } : entry)));
  }

  function updateQuestionCount(entry: BlueprintTopicEntry, value: number) {
    const preset = entry.bloomPreset || "BALANCED";
    updateEntry(entry.topicId, {
      questionCount: value,
      ...(preset === "CUSTOM" ? {} : bloomValues(value, preset)),
    });
  }

  function updatePreset(entry: BlueprintTopicEntry, preset: BloomPreset) {
    updateEntry(entry.topicId, {
      bloomPreset: preset,
      ...(preset === "CUSTOM" ? {} : bloomValues(entry.questionCount, preset)),
    });
  }

  const orderedEntries = topics
    .map((topic) => entries.find((entry) => entry.topicId === topic.id))
    .filter(Boolean) as BlueprintTopicEntry[];

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">1. Target Topics</p>
          <h3 className="mt-1 font-semibold text-gray-900">Choose what this exam covers</h3>
          <p className="mt-1 text-sm text-gray-500">Select all course topics targeted by this blueprint. The next section creates one allocation row per topic.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-5">
          {topics.map((topic) => {
            const selected = selectedIds.has(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => syncTopics(topic.id, !selected)}
                className={`text-left rounded-xl border px-4 py-3 transition ${
                  selected
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                    selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 text-transparent"
                  }`}>
                    ✓
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{topic.name}</p>
                    {topic.los.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {topic.los.map((lo) => (
                          <span key={lo.learningOutcomeId} className="bg-green-50 text-green-700 font-mono text-[11px] px-1.5 py-0.5 rounded">
                            {lo.learningOutcome.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">2. Allocate Questions, Points, and Bloom</p>
          <h3 className="mt-1 font-semibold text-gray-900">Set the assessment weight by topic</h3>
          <p className="mt-1 text-sm text-gray-500">Use presets for fast Bloom distribution. Open advanced details only when manual adjustment is needed.</p>
        </div>

        {orderedEntries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            Select one or more target topics above to start allocating questions and points.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orderedEntries.map((entry, index) => {
              const topic = topics.find((item) => item.id === entry.topicId);
              const preset = entry.bloomPreset || "BALANCED";

              return (
                <div key={entry.topicId} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-gray-900">{topic?.name || "Selected topic"}</h4>
                      </div>
                      {topic && topic.los.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 pl-9">
                          {topic.los.map((lo) => (
                            <span key={lo.learningOutcomeId} className="bg-green-50 text-green-700 font-mono text-[11px] px-1.5 py-0.5 rounded">
                              {lo.learningOutcome.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => syncTopics(entry.topicId, false)}
                      className="self-start text-sm text-gray-400 hover:text-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl bg-gray-50 p-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Questions</label>
                      <input
                        type="number"
                        min={0}
                        value={entry.questionCount || ""}
                        onChange={(event) => updateQuestionCount(entry, parseInt(event.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Points</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={entry.totalPoints || ""}
                        onChange={(event) => updateEntry(entry.topicId, { totalPoints: parseFloat(event.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Bloom Preset</label>
                      <select
                        value={preset}
                        onChange={(event) => updatePreset(entry, event.target.value as BloomPreset)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        {PRESETS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-400">
                        {PRESETS.find((item) => item.value === preset)?.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <BloomDetails entry={entry} onChange={(partial) => updateEntry(entry.topicId, partial)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
