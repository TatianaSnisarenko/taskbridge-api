-- CreateEnum
CREATE TYPE "TaskDisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TaskDisputeReasonType" AS ENUM ('DEVELOPER_UNRESPONSIVE', 'COMPLETION_NOT_CONFIRMED', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskDisputeResolutionAction" AS ENUM ('RETURN_TO_PROGRESS', 'MARK_FAILED', 'MARK_COMPLETED');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "completion_request_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "completion_requested_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "task_disputes" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "initiator_user_id" UUID NOT NULL,
    "initiator_persona" "Persona" NOT NULL,
    "source_status" "TaskStatus" NOT NULL,
    "reason_type" "TaskDisputeReasonType" NOT NULL,
    "reason_text" VARCHAR(2000) NOT NULL,
    "status" "TaskDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_action" "TaskDisputeResolutionAction",
    "resolution_reason" VARCHAR(2000),
    "resolved_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_disputes_status_created_at_idx" ON "task_disputes"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "task_disputes_task_id_created_at_idx" ON "task_disputes"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "task_disputes_initiator_user_id_created_at_idx" ON "task_disputes"("initiator_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "task_disputes_resolved_by_user_id_created_at_idx" ON "task_disputes"("resolved_by_user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "task_disputes" ADD CONSTRAINT "task_disputes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_disputes" ADD CONSTRAINT "task_disputes_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_disputes" ADD CONSTRAINT "task_disputes_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
