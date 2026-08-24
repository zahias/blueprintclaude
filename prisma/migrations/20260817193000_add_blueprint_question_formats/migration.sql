-- CreateEnum
CREATE TYPE "QuestionFormatGroup" AS ENUM ('CLOSED_ENDED', 'OPEN_ENDED');

-- CreateEnum
CREATE TYPE "QuestionFormatType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'ESSAY', 'CASE_SCENARIO', 'PROBLEM_SOLVING', 'ORAL_PRACTICAL', 'OTHER');

-- CreateTable
CREATE TABLE "BlueprintQuestionFormat" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "formatType" "QuestionFormatType" NOT NULL,
    "group" "QuestionFormatGroup" NOT NULL,
    "label" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "gradeWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintQuestionFormat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlueprintQuestionFormat_blueprintId_idx" ON "BlueprintQuestionFormat"("blueprintId");

-- AddForeignKey
ALTER TABLE "BlueprintQuestionFormat" ADD CONSTRAINT "BlueprintQuestionFormat_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
