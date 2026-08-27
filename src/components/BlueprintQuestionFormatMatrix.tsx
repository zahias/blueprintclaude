"use client";

import { QUESTION_FORMATS } from "@/lib/constants";
import type { BlueprintQuestionFormatEntry, QuestionFormatGroup, QuestionFormatType } from "@/lib/types";

interface BlueprintQuestionFormatMatrixProps {
  formats: BlueprintQuestionFormatEntry[];
  totalQuestionsExpected: number;
  onChange: (formats: BlueprintQuestionFormatEntry[]) => void;
}

const formatDefaults = QUESTION_FORMATS.map((format) => ({
  formatType: format.value as QuestionFormatType,
  group: format.group as QuestionFormatGroup,
  label: format.label,
  questionCount: 0,
  gradeWeight: 0,
}));

function mergeFormats(formats: BlueprintQuestionFormatEntry[]) {
  const byType = new Map(formats.map((format) => [format.formatType, format]));
  return formatDefaults.map((format) => ({ ...format, ...(byType.get(format.formatType) || {}) }));
}

export default function BlueprintQuestionFormatMatrix({
  formats,
  totalQuestionsExpected,
  onChange,
}: BlueprintQuestionFormatMatrixProps) {
  const rows = mergeFormats(formats);
  const questionTotal = rows.reduce((sum, row) => sum + row.questionCount, 0);
  const weightTotal = Math.round(rows.reduce((sum, row) => sum + row.gradeWeight, 0) * 100) / 100;
  const closedQuestions = rows.filter((row) => row.group === "CLOSED_ENDED").reduce((sum, row) => sum + row.questionCount, 0);
  const openQuestions = rows.filter((row) => row.group === "OPEN_ENDED").reduce((sum, row) => sum + row.questionCount, 0);

  function updateRow(formatType: QuestionFormatType, patch: Partial<BlueprintQuestionFormatEntry>) {
    const nextRows = rows.map((row) => row.formatType === formatType ? { ...row, ...patch } : row);
    onChange(nextRows);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900">Question Formats</h3>
        <p className="mt-1 text-sm text-gray-500">
          Enter how many questions use each format and the share of grade weight attached to each format.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total questions</p>
          <p className={`mt-1 text-xl font-bold ${questionTotal === totalQuestionsExpected ? "text-green-700" : "text-amber-700"}`}>
            {questionTotal} / {totalQuestionsExpected}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Grade weight</p>
          <p className={`mt-1 text-xl font-bold ${weightTotal === 100 ? "text-green-700" : "text-amber-700"}`}>{weightTotal}%</p>
        </div>
        <div className="rounded-lg bg-sky-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Closed-ended</p>
          <p className="mt-1 text-xl font-bold text-sky-900">{closedQuestions}</p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Open-ended</p>
          <p className="mt-1 text-xl font-bold text-indigo-900">{openQuestions}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Question Format</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Questions</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Grade Weight %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.formatType} className={row.questionCount > 0 || row.gradeWeight > 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    row.group === "CLOSED_ENDED" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    {row.group === "CLOSED_ENDED" ? "Closed-ended" : "Open-ended"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.questionCount}
                    onChange={(event) => updateRow(row.formatType, { questionCount: Math.max(0, parseInt(event.target.value) || 0) })}
                    className="mx-auto block w-24 rounded-lg border border-gray-300 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.gradeWeight}
                    onChange={(event) => updateRow(row.formatType, { gradeWeight: Math.max(0, parseFloat(event.target.value) || 0) })}
                    className="mx-auto block w-24 rounded-lg border border-gray-300 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
