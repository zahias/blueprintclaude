"use client";

import { useState } from "react";
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

const LOT_LEVELS = BLOOM_LEVELS.slice(0, 3); // Remember, Understand, Apply
const HOT_LEVELS = BLOOM_LEVELS.slice(3);     // Analyze, Evaluate, Create

function CollapsibleSection({
  title,
  badge,
  badgeColor,
  defaultOpen = false,
  invalid = false,
  children,
}: {
  title: string;
  badge: string;
  badgeColor: "green" | "red" | "gray";
  defaultOpen?: boolean;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-500",
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${invalid ? "border-red-300 bg-red-50/30" : "border-gray-200"}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-xs font-medium text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors[badgeColor]}`}>
            {badge}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

export default function TopicBuilder({ topics, entries, onChange }: TopicBuilderProps) {
  // Track which question types are enabled per entry
  const [enabledQTypes, setEnabledQTypes] = useState<Record<number, Set<string>>>(() => {
    const initial: Record<number, Set<string>> = {};
    entries.forEach((entry, i) => {
      const enabled = new Set(entry.questionTypes.filter((qt) => qt.count > 0).map((qt) => qt.questionType));
      initial[i] = enabled;
    });
    return initial;
  });

  function addEntry() {
    const newEntries = [...entries, emptyEntry()];
    setEnabledQTypes((prev) => ({ ...prev, [newEntries.length - 1]: new Set<string>() }));
    onChange(newEntries);
  }

  function updateEntry(index: number, partial: Partial<BlueprintTopicEntry>) {
    const updated = entries.map((e, i) => (i === index ? { ...e, ...partial } : e));
    onChange(updated);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
    // Reindex enabled question types
    setEnabledQTypes((prev) => {
      const next: Record<number, Set<string>> = {};
      let j = 0;
      entries.forEach((_, i) => {
        if (i !== index) {
          next[j] = prev[i] || new Set();
          j++;
        }
      });
      return next;
    });
  }

  function toggleQType(entryIndex: number, qType: string) {
    const current = new Set(enabledQTypes[entryIndex] || []);
    if (current.has(qType)) {
      current.delete(qType);
      // Also remove the count from entries
      const entry = entries[entryIndex];
      const filtered = entry.questionTypes.filter((qt) => qt.questionType !== qType);
      const updated = entries.map((e, i) => (i === entryIndex ? { ...e, questionTypes: filtered } : e));
      onChange(updated);
    } else {
      current.add(qType);
    }
    setEnabledQTypes((prev) => ({ ...prev, [entryIndex]: current }));
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
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-500 mb-1 font-medium">No topics added yet</p>
          <p className="text-gray-400 text-sm mb-4">Start building your blueprint by adding a topic</p>
          <button
            onClick={addEntry}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
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
        const hasQuestions = entry.questionCount > 0;
        const entryEnabledQTypes = enabledQTypes[index] || new Set();

        return (
          <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header — always visible */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-gray-900">
                  {selectedTopic ? selectedTopic.name : "New Topic"}
                </h3>
                {selectedTopic && selectedTopic.los.length > 0 && (
                  <div className="flex gap-1 ml-1">
                    {selectedTopic.los.map((l) => (
                      <span key={l.learningOutcomeId} className="bg-green-100 text-green-700 text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {l.learningOutcome.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeEntry(index)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                title="Remove topic"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Topic select + counts — compact row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
                  <select
                    value={entry.topicId}
                    onChange={(e) => updateEntry(index, { topicId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select topic...</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
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

              {/* Bloom's Distribution — collapsible */}
              <CollapsibleSection
                title="Bloom's Distribution"
                badge={hasQuestions ? `${bloomSum}/${entry.questionCount}` : "—"}
                badgeColor={!hasQuestions ? "gray" : bloomValid ? "green" : "red"}
                defaultOpen={hasQuestions && !bloomValid}
                invalid={hasQuestions && !bloomValid}
              >
                <p className="text-[11px] text-gray-400 mb-3">
                  Distribute questions across cognitive levels. Total must equal {entry.questionCount || "# of questions"}.
                </p>

                {/* LOT group */}
                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">
                    Lower-Order Thinking (LOT)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LOT_LEVELS.map((bloom) => {
                      const key = bloom.key as keyof BlueprintTopicEntry;
                      const val = entry[key] as number;
                      return (
                        <div key={bloom.key} className="relative">
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">{bloom.label}</label>
                          <input
                            type="number"
                            min={0}
                            value={val || ""}
                            onChange={(e) =>
                              updateEntry(index, { [bloom.key]: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0"
                          />
                          <div
                            className="h-1 rounded-full mt-1"
                            style={{ backgroundColor: bloom.color, opacity: 0.3 + (val / Math.max(entry.questionCount, 1)) * 0.7 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HOT group */}
                <div>
                  <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
                    Higher-Order Thinking (HOT)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {HOT_LEVELS.map((bloom) => {
                      const key = bloom.key as keyof BlueprintTopicEntry;
                      const val = entry[key] as number;
                      return (
                        <div key={bloom.key} className="relative">
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">{bloom.label}</label>
                          <input
                            type="number"
                            min={0}
                            value={val || ""}
                            onChange={(e) =>
                              updateEntry(index, { [bloom.key]: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0"
                          />
                          <div
                            className="h-1 rounded-full mt-1"
                            style={{ backgroundColor: bloom.color, opacity: 0.3 + (val / Math.max(entry.questionCount, 1)) * 0.7 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Question Types — collapsible, checkbox-first */}
              <CollapsibleSection
                title="Question Types"
                badge={hasQuestions ? `${qTypeSum}/${entry.questionCount}` : "—"}
                badgeColor={!hasQuestions ? "gray" : qTypeValid ? "green" : "red"}
                defaultOpen={hasQuestions && !qTypeValid}
                invalid={hasQuestions && !qTypeValid}
              >
                <p className="text-[11px] text-gray-400 mb-3">
                  Select which types apply, then set counts. Total must equal {entry.questionCount || "# of questions"}.
                </p>

                {/* Checkbox chips row */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {QUESTION_TYPES.map((qt) => {
                    const isActive = entryEnabledQTypes.has(qt.value);
                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => toggleQType(index, qt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          isActive
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {isActive && <span className="mr-1">✓</span>}
                        {qt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Count inputs — only for enabled types */}
                {Array.from(entryEnabledQTypes).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {QUESTION_TYPES.filter((qt) => entryEnabledQTypes.has(qt.value)).map((qt) => {
                      const existing = entry.questionTypes.find((x) => x.questionType === qt.value);
                      return (
                        <div key={qt.value} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <label className="text-xs text-gray-600 flex-1">{qt.label}</label>
                          <input
                            type="number"
                            min={0}
                            value={existing?.count || ""}
                            onChange={(e) => updateQType(index, qt.value, parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {Array.from(entryEnabledQTypes).length === 0 && (
                  <p className="text-[11px] text-gray-400 italic">Click a type above to get started</p>
                )}
              </CollapsibleSection>
            </div>
          </div>
        );
      })}

      {entries.length > 0 && (
        <button
          onClick={addEntry}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Another Topic
        </button>
      )}
    </div>
  );
}
