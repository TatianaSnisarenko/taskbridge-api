-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PUBLIC', 'UNLISTED');

-- CreateEnum
CREATE TYPE "ProjectReportReason" AS ENUM ('SPAM', 'SCAM', 'INAPPROPRIATE_CONTENT', 'MISLEADING', 'OTHER');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actor_user_id" UUID,
ADD COLUMN     "project_id" UUID,
ADD COLUMN     "task_id" UUID,
ADD COLUMN     "thread_id" UUID;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "project_id" UUID,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PUBLIC',
    "title" TEXT NOT NULL,
    "short_description" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_talents" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_reports" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "reason" "ProjectReportReason" NOT NULL,
    "comment" TEXT DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_owner_user_id_created_at_idx" ON "projects"("owner_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "projects_visibility_deleted_at_created_at_idx" ON "projects"("visibility", "deleted_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "projects_deleted_at_created_at_idx" ON "projects"("deleted_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_reports_project_id_created_at_idx" ON "project_reports"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_reports_reporter_user_id_created_at_idx" ON "project_reports"("reporter_user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "project_reports_project_id_reporter_user_id_key" ON "project_reports"("project_id", "reporter_user_id");

-- CreateIndex
CREATE INDEX "notifications_project_id_created_at_idx" ON "notifications"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_task_id_created_at_idx" ON "notifications"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_thread_id_created_at_idx" ON "notifications"("thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_project_id_created_at_idx" ON "tasks"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_deleted_at_created_at_idx" ON "tasks"("deleted_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_project_id_deleted_at_created_at_idx" ON "tasks"("project_id", "deleted_at", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
