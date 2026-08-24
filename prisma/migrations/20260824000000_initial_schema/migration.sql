-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BlueprintStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('FALL', 'SPRING', 'SUMMER');

-- CreateEnum
CREATE TYPE "QuestionFormatGroup" AS ENUM ('CLOSED_ENDED', 'OPEN_ENDED');

-- CreateEnum
CREATE TYPE "QuestionFormatType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'ESSAY', 'CASE_SCENARIO', 'PROBLEM_SOLVING', 'ORAL_PRACTICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "GradeAssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "GradebookStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "CourseReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coordinator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coordinator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordinatorMajor" (
    "coordinatorId" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,

    CONSTRAINT "CoordinatorMajor_pkey" PRIMARY KEY ("coordinatorId","majorId")
);

-- CreateTable
CREATE TABLE "InstructorMajor" (
    "instructorId" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,

    CONSTRAINT "InstructorMajor_pkey" PRIMARY KEY ("instructorId","majorId")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "semester" "Semester" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOfferingInstructor" (
    "courseOfferingId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseOfferingInstructor_pkey" PRIMARY KEY ("courseOfferingId","instructorId")
);

-- CreateTable
CREATE TABLE "CourseSyllabus" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseOfferingId" TEXT,
    "semester" "Semester" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "importedById" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "syllabusId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningOutcome" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "syllabusId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicLO" (
    "topicId" TEXT NOT NULL,
    "learningOutcomeId" TEXT NOT NULL,

    CONSTRAINT "TopicLO_pkey" PRIMARY KEY ("topicId","learningOutcomeId")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseOfferingId" TEXT,
    "instructorId" TEXT,
    "instructorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "semester" "Semester",
    "academicYear" TEXT,
    "examDate" TIMESTAMP(3),
    "duration" INTEGER,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "status" "BlueprintStatus" NOT NULL DEFAULT 'DRAFT',
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintTopic" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "bloomRemember" INTEGER NOT NULL DEFAULT 0,
    "bloomUnderstand" INTEGER NOT NULL DEFAULT 0,
    "bloomApply" INTEGER NOT NULL DEFAULT 0,
    "bloomAnalyze" INTEGER NOT NULL DEFAULT 0,
    "bloomEvaluate" INTEGER NOT NULL DEFAULT 0,
    "bloomCreate" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlueprintTopic_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "adminId" TEXT,
    "coordinatorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "universityStudentId" TEXT,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseOfferingId" TEXT,
    "studentId" TEXT NOT NULL,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeAssessment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseOfferingId" TEXT,
    "instructorId" TEXT NOT NULL,
    "blueprintId" TEXT,
    "name" TEXT NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "maxPoints" DOUBLE PRECISION NOT NULL,
    "status" "GradeAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gradebook" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "status" "GradebookStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gradebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeEntry" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rawPoints" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradebookComment" (
    "id" TEXT NOT NULL,
    "gradebookId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradebookComment_pkey" PRIMARY KEY ("id")
);

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
    "responses" JSONB,
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
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Coordinator_email_key" ON "Coordinator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_email_key" ON "Instructor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Major_name_key" ON "Major"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Course_majorId_code_key" ON "Course"("majorId", "code");

-- CreateIndex
CREATE INDEX "AcademicTerm_isActive_idx" ON "AcademicTerm"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_semester_academicYear_key" ON "AcademicTerm"("semester", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOffering_courseId_termId_key" ON "CourseOffering"("courseId", "termId");

-- CreateIndex
CREATE INDEX "CourseSyllabus_courseOfferingId_idx" ON "CourseSyllabus"("courseOfferingId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSyllabus_courseId_semester_academicYear_key" ON "CourseSyllabus"("courseId", "semester", "academicYear");

-- CreateIndex
CREATE INDEX "Topic_courseId_syllabusId_idx" ON "Topic"("courseId", "syllabusId");

-- CreateIndex
CREATE INDEX "LearningOutcome_courseId_syllabusId_idx" ON "LearningOutcome"("courseId", "syllabusId");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_accessToken_key" ON "Blueprint"("accessToken");

-- CreateIndex
CREATE INDEX "Blueprint_courseId_courseOfferingId_idx" ON "Blueprint"("courseId", "courseOfferingId");

-- CreateIndex
CREATE INDEX "Blueprint_instructorId_semester_academicYear_idx" ON "Blueprint"("instructorId", "semester", "academicYear");

-- CreateIndex
CREATE INDEX "BlueprintQuestionFormat_blueprintId_idx" ON "BlueprintQuestionFormat"("blueprintId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_universityStudentId_key" ON "Student"("universityStudentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "CourseEnrollment_courseId_studentId_idx" ON "CourseEnrollment"("courseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_courseOfferingId_studentId_key" ON "CourseEnrollment"("courseOfferingId", "studentId");

-- CreateIndex
CREATE INDEX "GradeAssessment_courseId_courseOfferingId_idx" ON "GradeAssessment"("courseId", "courseOfferingId");

-- CreateIndex
CREATE INDEX "GradeAssessment_instructorId_idx" ON "GradeAssessment"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "Gradebook_courseOfferingId_key" ON "Gradebook"("courseOfferingId");

-- CreateIndex
CREATE INDEX "Gradebook_status_idx" ON "Gradebook"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GradeEntry_assessmentId_studentId_key" ON "GradeEntry"("assessmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseReport_courseOfferingId_key" ON "CourseReport"("courseOfferingId");

-- CreateIndex
CREATE INDEX "CourseReport_instructorId_idx" ON "CourseReport"("instructorId");

-- CreateIndex
CREATE INDEX "CourseReport_status_idx" ON "CourseReport"("status");

-- AddForeignKey
ALTER TABLE "CoordinatorMajor" ADD CONSTRAINT "CoordinatorMajor_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordinatorMajor" ADD CONSTRAINT "CoordinatorMajor_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorMajor" ADD CONSTRAINT "InstructorMajor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorMajor" ADD CONSTRAINT "InstructorMajor_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOfferingInstructor" ADD CONSTRAINT "CourseOfferingInstructor_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOfferingInstructor" ADD CONSTRAINT "CourseOfferingInstructor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabus" ADD CONSTRAINT "CourseSyllabus_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabus" ADD CONSTRAINT "CourseSyllabus_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabus" ADD CONSTRAINT "CourseSyllabus_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "CourseSyllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcome" ADD CONSTRAINT "LearningOutcome_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcome" ADD CONSTRAINT "LearningOutcome_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "CourseSyllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicLO" ADD CONSTRAINT "TopicLO_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicLO" ADD CONSTRAINT "TopicLO_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintTopic" ADD CONSTRAINT "BlueprintTopic_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintTopic" ADD CONSTRAINT "BlueprintTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintQuestionFormat" ADD CONSTRAINT "BlueprintQuestionFormat_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gradebook" ADD CONSTRAINT "Gradebook_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gradebook" ADD CONSTRAINT "Gradebook_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "GradeAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradebookComment" ADD CONSTRAINT "GradebookComment_gradebookId_fkey" FOREIGN KEY ("gradebookId") REFERENCES "Gradebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradebookComment" ADD CONSTRAINT "GradebookComment_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
