export const BLOOM_LEVELS = [
  { key: "bloomRemember", label: "Remember", color: "#ef4444" },
  { key: "bloomUnderstand", label: "Understand", color: "#f97316" },
  { key: "bloomApply", label: "Apply", color: "#eab308" },
  { key: "bloomAnalyze", label: "Analyze", color: "#22c55e" },
  { key: "bloomEvaluate", label: "Evaluate", color: "#3b82f6" },
  { key: "bloomCreate", label: "Create", color: "#8b5cf6" },
] as const;

export const QUESTION_TYPES = [
  { value: "MCQ", label: "Multiple Choice" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "ESSAY", label: "Essay" },
  { value: "TRUE_FALSE", label: "True/False" },
  { value: "PROBLEM_SOLVING", label: "Problem Solving" },
] as const;

export const BLUEPRINT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const BLUEPRINT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};
