-- Create report moderation enums
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "ContentReportResolutionAction" AS ENUM ('DISMISS', 'DELETE');

-- Add moderation fields to project reports
ALTER TABLE "project_reports"
ADD COLUMN "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "resolution_action" "ContentReportResolutionAction",
ADD COLUMN "resolution_note" TEXT,
ADD COLUMN "resolved_by_user_id" UUID,
ADD COLUMN "resolved_at" TIMESTAMPTZ(6);

ALTER TABLE "project_reports"
ADD CONSTRAINT "project_reports_resolved_by_user_id_fkey"
FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "project_reports_status_created_at_idx"
ON "project_reports"("status", "created_at" DESC);

-- Create task reports table
CREATE TABLE "task_reports" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "reporter_user_id" UUID NOT NULL,
  "reporter_persona" "Persona" NOT NULL,
  "reason" "ProjectReportReason" NOT NULL,
  "comment" TEXT DEFAULT '',
  "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolution_action" "ContentReportResolutionAction",
  "resolution_note" TEXT,
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_reports_task_id_reporter_user_id_key"
ON "task_reports"("task_id", "reporter_user_id");

CREATE INDEX "task_reports_status_created_at_idx"
ON "task_reports"("status", "created_at" DESC);

CREATE INDEX "task_reports_task_id_created_at_idx"
ON "task_reports"("task_id", "created_at" DESC);

CREATE INDEX "task_reports_reporter_user_id_created_at_idx"
ON "task_reports"("reporter_user_id", "created_at" DESC);

ALTER TABLE "task_reports"
ADD CONSTRAINT "task_reports_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_reports"
ADD CONSTRAINT "task_reports_reporter_user_id_fkey"
FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_reports"
ADD CONSTRAINT "task_reports_resolved_by_user_id_fkey"
FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
