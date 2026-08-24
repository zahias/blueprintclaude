-- CreateEnum
CREATE TYPE "CourseReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');

-- CreateTable
CREATE TABLE "CourseReport" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "status" "CourseReportStatus" NOT NULL DEFAULT 'DRAFT',
    "topicsCovered" JSONB,
    "attendanceConcerns" JSONB,
    "highestScores" JSONB,
    "lowestScores" JSONB,
    "assessmentEvidence" JSONB,
    "gradeSummary" TEXT,
    "reflection" TEXT,
    "improvementPlan" TEXT,
    "evidenceNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseReportComment" (
    "id" TEXT NOT NULL,
    "courseReportId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseReport_courseOfferingId_key" ON "CourseReport"("courseOfferingId");

-- CreateIndex
CREATE INDEX "CourseReport_instructorId_idx" ON "CourseReport"("instructorId");

-- CreateIndex
CREATE INDEX "CourseReport_status_idx" ON "CourseReport"("status");

-- AddForeignKey
ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReportComment" ADD CONSTRAINT "CourseReportComment_courseReportId_fkey" FOREIGN KEY ("courseReportId") REFERENCES "CourseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReportComment" ADD CONSTRAINT "CourseReportComment_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
