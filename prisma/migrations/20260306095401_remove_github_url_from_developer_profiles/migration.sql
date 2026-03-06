/*
  Warnings:

  - You are about to drop the column `github_url` on the `developer_profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "developer_technologies" DROP CONSTRAINT "developer_technologies_developer_user_id_fkey";

-- DropForeignKey
ALTER TABLE "developer_technologies" DROP CONSTRAINT "developer_technologies_technology_id_fkey";

-- DropForeignKey
ALTER TABLE "task_technologies" DROP CONSTRAINT "task_technologies_task_id_fkey";

-- DropForeignKey
ALTER TABLE "task_technologies" DROP CONSTRAINT "task_technologies_technology_id_fkey";

-- DropForeignKey
ALTER TABLE "technology_suggestions" DROP CONSTRAINT "technology_suggestions_technology_id_fkey";

-- DropIndex
DROP INDEX "technologies_name_trgm_idx";

-- DropIndex
DROP INDEX "technologies_slug_trgm_idx";

-- AlterTable
ALTER TABLE "developer_profiles" DROP COLUMN "github_url";

-- AlterTable
ALTER TABLE "developer_technologies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_technologies" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "task_technologies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "technologies" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "technology_suggestions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "technology_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "developer_technologies" ADD CONSTRAINT "developer_technologies_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "developer_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_technologies" ADD CONSTRAINT "developer_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_technologies" ADD CONSTRAINT "task_technologies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_technologies" ADD CONSTRAINT "task_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_suggestions" ADD CONSTRAINT "technology_suggestions_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
