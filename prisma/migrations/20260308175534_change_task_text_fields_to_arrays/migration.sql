/*
  Warnings:

  - The `deliverables` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `requirements` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `nice_to_have` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "deliverables",
ADD COLUMN     "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "requirements",
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "nice_to_have",
ADD COLUMN     "nice_to_have" TEXT[] DEFAULT ARRAY[]::TEXT[];
