DO $$
BEGIN
  CREATE TYPE "GradebookStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Gradebook" (
  "id" TEXT NOT NULL,
  "courseOfferingId" TEXT NOT NULL,
  "status" "GradebookStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Gradebook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Gradebook_courseOfferingId_key" ON "Gradebook"("courseOfferingId");
CREATE INDEX IF NOT EXISTS "Gradebook_status_idx" ON "Gradebook"("status");

DO $$
BEGIN
  ALTER TABLE "Gradebook" ADD CONSTRAINT "Gradebook_courseOfferingId_fkey"
    FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Gradebook" ADD CONSTRAINT "Gradebook_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GradebookComment" (
  "id" TEXT NOT NULL,
  "gradebookId" TEXT NOT NULL,
  "coordinatorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GradebookComment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "GradebookComment" ADD CONSTRAINT "GradebookComment_gradebookId_fkey"
    FOREIGN KEY ("gradebookId") REFERENCES "Gradebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "GradebookComment" ADD CONSTRAINT "GradebookComment_coordinatorId_fkey"
    FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

WITH grouped AS (
  SELECT
    "courseOfferingId",
    array_agg(status::text) AS statuses,
    max("submittedAt") AS "submittedAt",
    max("reviewedAt") AS "reviewedAt",
    (array_remove(array_agg("reviewedById"), NULL))[1] AS "reviewedById"
  FROM "GradeAssessment"
  WHERE "courseOfferingId" IS NOT NULL
  GROUP BY "courseOfferingId"
),
derived AS (
  SELECT
    "courseOfferingId",
    CASE
      WHEN bool_and(s = 'APPROVED') THEN 'APPROVED'
      WHEN bool_and(s = 'SUBMITTED') THEN 'SUBMITTED'
      WHEN bool_and(s = 'NEEDS_REVISION') THEN 'NEEDS_REVISION'
      WHEN bool_or(s = 'SUBMITTED') THEN 'SUBMITTED'
      WHEN bool_or(s = 'NEEDS_REVISION') THEN 'NEEDS_REVISION'
      ELSE 'DRAFT'
    END::"GradebookStatus" AS status,
    max("submittedAt") AS "submittedAt",
    max("reviewedAt") AS "reviewedAt",
    max("reviewedById") AS "reviewedById"
  FROM grouped, unnest(statuses) s
  GROUP BY "courseOfferingId"
)
INSERT INTO "Gradebook" ("id", "courseOfferingId", "status", "submittedAt", "reviewedAt", "reviewedById", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "courseOfferingId", status, "submittedAt", "reviewedAt", "reviewedById", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM derived
ON CONFLICT ("courseOfferingId") DO UPDATE SET
  "status" = EXCLUDED."status",
  "submittedAt" = EXCLUDED."submittedAt",
  "reviewedAt" = EXCLUDED."reviewedAt",
  "reviewedById" = EXCLUDED."reviewedById",
  "updatedAt" = CURRENT_TIMESTAMP;

WITH legacy_comments AS (
  SELECT DISTINCT
    gb."id" AS "gradebookId",
    gac."coordinatorId",
    gac."content",
    min(gac."createdAt") AS "createdAt"
  FROM "GradeAssessmentComment" gac
  JOIN "GradeAssessment" ga ON ga."id" = gac."assessmentId"
  JOIN "Gradebook" gb ON gb."courseOfferingId" = ga."courseOfferingId"
  GROUP BY gb."id", gac."coordinatorId", gac."content"
)
INSERT INTO "GradebookComment" ("id", "gradebookId", "coordinatorId", "content", "createdAt")
SELECT gen_random_uuid()::text, "gradebookId", "coordinatorId", "content", "createdAt"
FROM legacy_comments lc
WHERE NOT EXISTS (
  SELECT 1 FROM "GradebookComment" gbc
  WHERE gbc."gradebookId" = lc."gradebookId"
    AND gbc."coordinatorId" = lc."coordinatorId"
    AND gbc."content" = lc."content"
);
