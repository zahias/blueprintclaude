-- DropForeignKey
ALTER TABLE "GradeAssessmentComment" DROP CONSTRAINT "GradeAssessmentComment_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "GradeAssessmentComment" DROP CONSTRAINT "GradeAssessmentComment_coordinatorId_fkey";

-- DropTable
DROP TABLE "GradeAssessmentComment";

