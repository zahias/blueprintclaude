export const BLOOM_LEVELS = [
  { key: "bloomRemember", label: "Remember", color: "#ef4444", description: "Recall facts and basic concepts. Verbs: define, list, memorize, name, identify, recognize." },
  { key: "bloomUnderstand", label: "Understand", color: "#f97316", description: "Explain ideas or concepts. Verbs: describe, explain, summarize, paraphrase, classify, compare." },
  { key: "bloomApply", label: "Apply", color: "#eab308", description: "Use information in new situations. Verbs: execute, implement, solve, use, demonstrate, calculate." },
  { key: "bloomAnalyze", label: "Analyze", color: "#22c55e", description: "Draw connections among ideas, break into parts. Verbs: differentiate, organize, compare, contrast, examine." },
  { key: "bloomEvaluate", label: "Evaluate", color: "#3b82f6", description: "Justify a stand or decision. Verbs: argue, defend, judge, critique, assess, justify." },
  { key: "bloomCreate", label: "Create", color: "#8b5cf6", description: "Produce new or original work. Verbs: design, assemble, construct, develop, formulate, author." },
] as const;

export const QUESTION_TYPES = [
  { value: "MCQ", label: "Multiple Choice", description: "Questions with several options and one correct answer. Best for testing recall, comprehension, and application." },
  { value: "SHORT_ANSWER", label: "Short Answer", description: "Brief written responses (a few words to a sentence). Good for testing specific knowledge and understanding." },
  { value: "ESSAY", label: "Essay", description: "Extended written responses requiring analysis, synthesis, or evaluation. Best for higher-order thinking." },
  { value: "TRUE_FALSE", label: "True/False", description: "Statements that students mark as true or false. Useful for quick recall and factual assessment." },
  { value: "PROBLEM_SOLVING", label: "Problem Solving", description: "Questions requiring multi-step solutions, calculations, or procedures. Ideal for application and analysis." },
] as const;

export const SEMESTERS = [
  { value: "FALL", label: "Fall" },
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
] as const;

export function getAcademicYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let i = -2; i <= 2; i++) {
    const start = currentYear + i;
    years.push(`${start}/${start + 1}`);
  }
  return years;
}

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
