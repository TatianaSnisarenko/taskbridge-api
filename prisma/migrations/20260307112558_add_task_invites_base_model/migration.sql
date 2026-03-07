-- CreateEnum
CREATE TYPE "TaskInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TASK_INVITE_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_INVITE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_INVITE_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_INVITE_CANCELLED';

-- CreateTable
CREATE TABLE "task_invites" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "company_user_id" UUID NOT NULL,
    "developer_user_id" UUID NOT NULL,
    "status" "TaskInviteStatus" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "responded_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_invites_task_id_created_at_idx" ON "task_invites"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "task_invites_developer_user_id_created_at_idx" ON "task_invites"("developer_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "task_invites_company_user_id_created_at_idx" ON "task_invites"("company_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "task_invites_status_created_at_idx" ON "task_invites"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "task_invites_task_id_developer_user_id_key" ON "task_invites"("task_id", "developer_user_id");

-- AddForeignKey
ALTER TABLE "task_invites" ADD CONSTRAINT "task_invites_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_invites" ADD CONSTRAINT "task_invites_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_invites" ADD CONSTRAINT "task_invites_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
