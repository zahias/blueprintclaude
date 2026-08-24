"use client";

import { useMemo, useState } from "react";
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

interface BlueprintTopicSelectorProps {
  topics: TopicData[];
  entries: BlueprintTopicEntry[];
  onChange: (entries: BlueprintTopicEntry[]) => void;
}

function emptyEntry(topicId: string): BlueprintTopicEntry {
  return {
    topicId,
    questionCount: 0,
    totalPoints: 0,
    bloomRemember: 0,
    bloomUnderstand: 0,
    bloomApply: 0,
    bloomAnalyze: 0,
    bloomEvaluate: 0,
    bloomCreate: 0,
    bloomPreset: "CUSTOM",
  };
}

export default function BlueprintTopicSelector({ topics, entries, onChange }: BlueprintTopicSelectorProps) {
  const [query, setQuery] = useState("");
  const selectedIds = useMemo(() => new Set(entries.map((entry) => entry.topicId)), [entries]);
  const filteredTopics = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;
    return topics.filter((topic) =>
      topic.name.toLowerCase().includes(normalized)
      || topic.los.some((lo) => lo.learningOutcome.code.toLowerCase().includes(normalized))
    );
  }, [query, topics]);

  function setSelected(topicId: string, selected: boolean) {
    if (selected) {
      const next = [...entries, emptyEntry(topicId)];
      onChange(topics.map((topic) => next.find((entry) => entry.topicId === topic.id)).filter(Boolean) as BlueprintTopicEntry[]);
      return;
    }
    onChange(entries.filter((entry) => entry.topicId !== topicId));
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Select Target Topics</h3>
            <p className="mt-1 text-sm text-gray-500">Choose the course topics covered by this exam.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics or CLOs"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 md:w-72"
          />
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          No topics are available for this course and term. Ask the coordinator to import or review the syllabus.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 p-5 md:grid-cols-2">
          {filteredTopics.map((topic) => {
            const selected = selectedIds.has(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelected(topic.id, !selected)}
                className={`min-h-24 rounded-lg border px-4 py-3 text-left transition ${
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
                      <div className="mt-2 flex flex-wrap gap-1">
                        {topic.los.map((lo) => (
                          <span key={lo.learningOutcomeId} className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-[11px] text-green-700">
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
      )}
    </section>
  );
}
