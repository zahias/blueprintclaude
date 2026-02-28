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
