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

export function getSubmitIssues(
  entries: BlueprintTopicEntry[],
  topics: { id: string; name: string }[],
  totalMarks: number,
): string[] {
  const issues: string[] = [];
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
