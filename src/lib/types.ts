export interface BlueprintTopicEntry {
  topicId: string;
  questionCount: number;
  totalPoints: number;
  bloomRemember: number;
  bloomUnderstand: number;
  bloomApply: number;
  bloomAnalyze: number;
  bloomEvaluate: number;
  bloomCreate: number;
  bloomPreset?: "BALANCED" | "FOUNDATIONAL" | "HIGHER_ORDER" | "CUSTOM";
}

export type QuestionFormatGroup = "CLOSED_ENDED" | "OPEN_ENDED";

export type QuestionFormatType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MATCHING"
  | "FILL_IN_BLANK"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "CASE_SCENARIO"
  | "PROBLEM_SOLVING"
  | "ORAL_PRACTICAL"
  | "OTHER";

export interface BlueprintQuestionFormatEntry {
  formatType: QuestionFormatType;
  group: QuestionFormatGroup;
  label?: string;
  questionCount: number;
  gradeWeight: number;
}

export interface BlueprintInsight {
  severity: "info" | "warning";
  title: string;
  detail: string;
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function getBlueprintPayloadIssues(
  entries: BlueprintTopicEntry[],
  topics: { id: string; name: string }[],
): string[] {
  const issues: string[] = [];
  const topicIds = new Set(topics.map((t) => t.id));
  const seenTopicIds = new Set<string>();

  entries.forEach((entry, index) => {
    const label = entry.topicId
      ? topics.find((t) => t.id === entry.topicId)?.name || `Topic ${index + 1}`
      : `Topic ${index + 1}`;

    if (!entry.topicId) {
      issues.push(`${label}: Select a topic`);
    } else if (!topicIds.has(entry.topicId)) {
      issues.push(`${label}: Topic does not belong to this course`);
    } else if (seenTopicIds.has(entry.topicId)) {
      issues.push(`${label}: Topic is duplicated`);
    }
    if (entry.topicId) seenTopicIds.add(entry.topicId);

    if (!Number.isInteger(entry.questionCount) || !isFiniteNonNegative(entry.questionCount)) {
      issues.push(`${label}: Question count must be a whole number of 0 or more`);
    }
    if (!isFiniteNonNegative(entry.totalPoints)) {
      issues.push(`${label}: Total points must be 0 or more`);
    }

    const bloomValues = [
      entry.bloomRemember,
      entry.bloomUnderstand,
      entry.bloomApply,
      entry.bloomAnalyze,
      entry.bloomEvaluate,
      entry.bloomCreate,
    ];
    if (bloomValues.some((value) => !Number.isInteger(value) || !isFiniteNonNegative(value))) {
      issues.push(`${label}: Bloom counts must be whole numbers of 0 or more`);
    }

  });

  return issues;
}

export function getSubmitIssues(
  entries: BlueprintTopicEntry[],
  topics: { id: string; name: string }[],
  totalQuestionsExpected: number,
): string[] {
  const issues = getBlueprintPayloadIssues(entries, topics);
  if (entries.length === 0) {
    issues.push("Add at least one topic");
    return issues;
  }
  if (!Number.isInteger(totalQuestionsExpected) || totalQuestionsExpected <= 0) {
    issues.push("Enter the total number of questions");
  }
  entries.forEach((te) => {
    const name = topics.find((t) => t.id === te.topicId)?.name || "A topic";
    if (!te.topicId) issues.push(`${name}: Select a topic`);
    if (te.questionCount <= 0) issues.push(`${name}: Set number of questions`);
    const bloomSum = te.bloomRemember + te.bloomUnderstand + te.bloomApply + te.bloomAnalyze + te.bloomEvaluate + te.bloomCreate;
    if (te.questionCount > 0 && bloomSum !== te.questionCount) {
      issues.push(`${name}: Bloom distribution (${bloomSum}/${te.questionCount})`);
    }
  });
  const matrixQuestionTotal = entries.reduce((s, te) => s + te.questionCount, 0);
  if (totalQuestionsExpected > 0 && matrixQuestionTotal !== totalQuestionsExpected) {
    issues.push(`Matrix has ${matrixQuestionTotal} questions but Exam Details says ${totalQuestionsExpected}`);
  }
  return issues;
}

export function getQuestionFormatIssues(
  formats: BlueprintQuestionFormatEntry[],
  totalQuestionsExpected: number,
  requireComplete: boolean,
): string[] {
  const issues: string[] = [];
  const activeFormats = formats.filter((format) => format.questionCount > 0 || format.gradeWeight > 0);

  activeFormats.forEach((format) => {
    const label = format.label || format.formatType.replaceAll("_", " ");
    if (!Number.isInteger(format.questionCount) || !isFiniteNonNegative(format.questionCount)) {
      issues.push(`${label}: Question count must be a whole number of 0 or more`);
    }
    if (!isFiniteNonNegative(format.gradeWeight)) {
      issues.push(`${label}: Grade weight must be 0 or more`);
    }
  });

  if (!requireComplete) return issues;

  if (activeFormats.length === 0) {
    issues.push("Add question formats for this exam");
    return issues;
  }

  const formatQuestionTotal = activeFormats.reduce((sum, format) => sum + format.questionCount, 0);
  if (totalQuestionsExpected > 0 && formatQuestionTotal !== totalQuestionsExpected) {
    issues.push(`Question formats have ${formatQuestionTotal} questions but Exam Details says ${totalQuestionsExpected}`);
  }

  const gradeWeightTotal = Math.round(activeFormats.reduce((sum, format) => sum + format.gradeWeight, 0) * 100) / 100;
  if (gradeWeightTotal !== 100) {
    issues.push(`Question format grade weights must total 100% but currently total ${gradeWeightTotal}%`);
  }

  return issues;
}

export function getBloomInsights(lowOrderQuestions: number, highOrderQuestions: number, totalQuestions: number): BlueprintInsight[] {
  if (totalQuestions <= 0) return [];
  const insights: BlueprintInsight[] = [];
  const lowOrderPct = (lowOrderQuestions / totalQuestions) * 100;
  const highOrderPct = (highOrderQuestions / totalQuestions) * 100;

  if (lowOrderPct >= 70) {
    insights.push({
      severity: "warning",
      title: "Too much Low Order Thinking",
      detail: `${Math.round(lowOrderPct)}% of questions are Remember, Understand, or Apply. Consider shifting some toward Analyze, Evaluate, or Create.`,
    });
  }
  if (highOrderPct < 15) {
    insights.push({
      severity: "warning",
      title: "Too little High Order Thinking",
      detail: `Only ${Math.round(highOrderPct)}% of questions are Analyze, Evaluate, or Create. Consider adding questions that require deeper reasoning.`,
    });
  }

  return insights;
}

export function getQuestionFormatInsights(
  formats: BlueprintQuestionFormatEntry[],
  highOrderQuestions = 0,
  totalQuestionsExpected?: number,
): BlueprintInsight[] {
  const activeFormats = formats.filter((format) => format.questionCount > 0 || format.gradeWeight > 0);
  const totalQuestions = totalQuestionsExpected || activeFormats.reduce((sum, format) => sum + format.questionCount, 0);
  const totalWeight = activeFormats.reduce((sum, format) => sum + format.gradeWeight, 0);
  if (activeFormats.length === 0 || totalQuestions <= 0) return [];

  const closedQuestions = activeFormats
    .filter((format) => format.group === "CLOSED_ENDED")
    .reduce((sum, format) => sum + format.questionCount, 0);
  const openQuestions = activeFormats
    .filter((format) => format.group === "OPEN_ENDED")
    .reduce((sum, format) => sum + format.questionCount, 0);
  const closedWeight = activeFormats
    .filter((format) => format.group === "CLOSED_ENDED")
    .reduce((sum, format) => sum + format.gradeWeight, 0);
  const openWeight = activeFormats
    .filter((format) => format.group === "OPEN_ENDED")
    .reduce((sum, format) => sum + format.gradeWeight, 0);

  const insights: BlueprintInsight[] = [];
  const closedPct = (closedQuestions / totalQuestions) * 100;
  const openPct = (openQuestions / totalQuestions) * 100;
  const closedWeightPct = totalWeight > 0 ? (closedWeight / totalWeight) * 100 : 0;
  const openWeightPct = totalWeight > 0 ? (openWeight / totalWeight) * 100 : 0;

  if (activeFormats.length === 1) {
    insights.push({
      severity: "warning",
      title: "Limited question variety",
      detail: "This exam uses only one question format. Consider adding another format if it fits the learning outcomes.",
    });
  }
  const activeOpenEndedTypes = new Set(
    activeFormats.filter((format) => format.group === "OPEN_ENDED").map((format) => format.formatType)
  );
  if (openQuestions > 0 && activeOpenEndedTypes.size === 1) {
    insights.push({
      severity: "warning",
      title: "Weak open-ended variety",
      detail: "All open-ended questions use a single format. Mixing in another open-ended type (e.g. short answer, essay, case scenario) can capture a wider range of reasoning.",
    });
  }
  if (closedPct >= 80) {
    insights.push({
      severity: "warning",
      title: "Mostly closed-ended questions",
      detail: `${Math.round(closedPct)}% of questions are closed-ended. Consider whether the exam has enough evidence of explanation, reasoning, or application.`,
    });
  }
  if (openPct < 20) {
    insights.push({
      severity: "warning",
      title: "Low open-ended question share",
      detail: `Only ${Math.round(openPct)}% of questions are open-ended. This may limit evidence for complex learning outcomes.`,
    });
  }
  if (openWeightPct < 20) {
    insights.push({
      severity: "warning",
      title: "Low open-ended grade weight",
      detail: `Open-ended questions carry ${Math.round(openWeightPct)}% of the grade weight. Check whether this matches the course outcomes.`,
    });
  }
  if (closedWeightPct >= 75) {
    insights.push({
      severity: "warning",
      title: "Grade weight concentrated in closed-ended formats",
      detail: `${Math.round(closedWeightPct)}% of grade weight is attached to closed-ended questions.`,
    });
  }
  if (highOrderQuestions > 0 && highOrderQuestions / totalQuestions >= 0.35 && openPct < 30) {
    insights.push({
      severity: "warning",
      title: "High-order thinking may need stronger evidence",
      detail: "The Bloom matrix includes substantial High Order Thinking, but open-ended formats are limited.",
    });
  }

  return insights;
}
