import { QUESTION_TYPES } from "@/lib/constants";

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
  questionTypes: { questionType: string; count: number }[];
}

const VALID_QUESTION_TYPES = new Set(QUESTION_TYPES.map((qt) => qt.value));

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

    entry.questionTypes.forEach((qt) => {
      if (!VALID_QUESTION_TYPES.has(qt.questionType as (typeof QUESTION_TYPES)[number]["value"])) {
        issues.push(`${label}: Unknown question type ${qt.questionType}`);
      }
      if (!Number.isInteger(qt.count) || !isFiniteNonNegative(qt.count)) {
        issues.push(`${label}: Question type counts must be whole numbers of 0 or more`);
      }
    });
  });

  return issues;
}

export function getSubmitIssues(
  entries: BlueprintTopicEntry[],
  topics: { id: string; name: string }[],
  totalMarks: number,
): string[] {
  const issues = getBlueprintPayloadIssues(entries, topics);
  if (entries.length === 0) {
    issues.push("Add at least one topic");
    return issues;
  }
  entries.forEach((te) => {
    const name = topics.find((t) => t.id === te.topicId)?.name || "A topic";
    if (!te.topicId) issues.push(`${name}: Select a topic`);
    if (te.questionCount <= 0) issues.push(`${name}: Set number of questions`);
    const bloomSum = te.bloomRemember + te.bloomUnderstand + te.bloomApply + te.bloomAnalyze + te.bloomEvaluate + te.bloomCreate;
    if (te.questionCount > 0 && bloomSum !== te.questionCount) {
      issues.push(`${name}: Bloom distribution (${bloomSum}/${te.questionCount})`);
    }
    const qTypeSum = te.questionTypes.reduce((s, qt) => s + qt.count, 0);
    if (te.questionCount > 0 && qTypeSum !== te.questionCount) {
      issues.push(`${name}: Question types (${qTypeSum}/${te.questionCount})`);
    }
  });
  const totalPointsCalc = entries.reduce((s, te) => s + te.totalPoints, 0);
  if (totalPointsCalc !== totalMarks) {
    issues.push(`Total points (${totalPointsCalc}) must equal exam marks (${totalMarks})`);
  }
  return issues;
}
