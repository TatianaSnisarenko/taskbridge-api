-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "failed_at" TIMESTAMPTZ(6),
ADD COLUMN     "rejection_count" INTEGER NOT NULL DEFAULT 0;
