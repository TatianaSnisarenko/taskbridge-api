/*
  Warnings:

  - Added the required column `reporter_persona` to the `project_reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "project_reports" ADD COLUMN     "reporter_persona" "Persona" NOT NULL;
