"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GRADE_SCALE, getGradeStats } from "@/lib/grades";

interface Props {
  percents: number[];
  height?: number;
}

const ascendingGrades = [...GRADE_SCALE].reverse();

function normalDensity(x: number, mean: number, standardDeviation: number) {
  if (standardDeviation <= 0) return 0;
  const exponent = -0.5 * Math.pow((x - mean) / standardDeviation, 2);
  return (1 / (standardDeviation * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

export default function GradeDistributionChart({ percents, height = 300 }: Props) {
  const stats = getGradeStats(percents);
  const counts = ascendingGrades.map((grade, index) => {
    const next = ascendingGrades[index + 1];
    const max = next ? next.min : 100.01;
    const values = percents.filter((percent) => percent >= grade.min && percent < max);
    return {
      letter: grade.letter,
      min: grade.min,
      midpoint: next ? (grade.min + next.min) / 2 : 95,
      students: values.length,
    };
  });

  const maxCount = Math.max(1, ...counts.map((item) => item.students));
  const maxDensity = Math.max(0.0001, ...counts.map((item) => normalDensity(item.midpoint, stats.average, stats.standardDeviation)));
  const data = counts.map((item) => ({
    ...item,
    curve: Math.round((normalDensity(item.midpoint, stats.average, stats.standardDeviation) / maxDensity) * maxCount * 100) / 100,
  }));

  if (percents.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">No grade data yet.</div>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="letter" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [value, name === "students" ? "Students" : "Bell curve"]}
            labelFormatter={(label) => `Grade ${label}`}
          />
          <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="curve" stroke="#0f766e" strokeWidth={3} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
