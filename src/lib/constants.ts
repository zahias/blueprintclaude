export const BLOOM_LEVELS = [
  { key: "bloomRemember", label: "Remember", color: "#ef4444", description: "Recall facts and basic concepts. Verbs: define, list, memorize, name, identify, recognize." },
  { key: "bloomUnderstand", label: "Understand", color: "#f97316", description: "Explain ideas or concepts. Verbs: describe, explain, summarize, paraphrase, classify, compare." },
  { key: "bloomApply", label: "Apply", color: "#eab308", description: "Use information in new situations. Verbs: execute, implement, solve, use, demonstrate, calculate." },
  { key: "bloomAnalyze", label: "Analyze", color: "#22c55e", description: "Draw connections among ideas, break into parts. Verbs: differentiate, organize, compare, contrast, examine." },
  { key: "bloomEvaluate", label: "Evaluate", color: "#3b82f6", description: "Justify a stand or decision. Verbs: argue, defend, judge, critique, assess, justify." },
  { key: "bloomCreate", label: "Create", color: "#8b5cf6", description: "Produce new or original work. Verbs: design, assemble, construct, develop, formulate, author." },
] as const;

export const QUESTION_FORMATS = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice", group: "CLOSED_ENDED" },
  { value: "TRUE_FALSE", label: "True/False", group: "CLOSED_ENDED" },
  { value: "MATCHING", label: "Matching", group: "CLOSED_ENDED" },
  { value: "FILL_IN_BLANK", label: "Fill in the Blank", group: "CLOSED_ENDED" },
  { value: "SHORT_ANSWER", label: "Short Answer", group: "OPEN_ENDED" },
  { value: "ESSAY", label: "Essay", group: "OPEN_ENDED" },
  { value: "CASE_SCENARIO", label: "Case/Scenario", group: "OPEN_ENDED" },
  { value: "PROBLEM_SOLVING", label: "Problem Solving", group: "OPEN_ENDED" },
  { value: "ORAL_PRACTICAL", label: "Oral/Practical", group: "OPEN_ENDED" },
  { value: "OTHER", label: "Other", group: "OPEN_ENDED" },
] as const;

export const COURSE_PROGRESS_REPORT_PROMPTS = [
  {
    key: "learningOutcomeEvidence",
    title: "Learning Outcomes",
    prompt: "Using examples from your teaching and learning practice in this semester, explain how you have met the learning outcomes set in the syllabus of this course.",
  },
  {
    key: "studentCenteredness",
    title: "Student-Centeredness and Participation",
    prompt: "In working towards meeting the learning outcomes, how have you promoted student-centeredness and students' active participation in the teaching and learning process?",
  },
  {
    key: "teachingMethods",
    title: "Teaching Methods",
    prompt: "What teaching methods have you adopted, such as inquiry-based learning, project-based learning, team-based learning, or other student-initiated learning activities? Explain the rationale behind each method and provide examples where applicable.",
  },
  {
    key: "realLifeWorkplaceCommunity",
    title: "Real-Life, Workplace, and Community Learning",
    prompt: "How have you mapped your course to real-life examples and/or learning in the workplace and community?",
  },
  {
    key: "technologyIntegration",
    title: "Technology Integration",
    prompt: "In what ways have you integrated technology in your classroom? List the ICT tools used to support students' understanding and active involvement.",
  },
  {
    key: "differentiatedTeaching",
    title: "Differentiated Teaching",
    prompt: "How have you differentiated your teaching approach to respond to students' various needs and capabilities?",
  },
  {
    key: "genericSkillsDevelopment",
    title: "Generic Skills Development",
    prompt: "In the context of your course, explain how you have worked on developing students' essential generic skills, such as critical thinking, problem solving, communication, organization, time management, and leadership.",
  },
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
  NEEDS_REVISION: "Needs Revision",
};

export const BLUEPRINT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  NEEDS_REVISION: "bg-amber-100 text-amber-700",
};
