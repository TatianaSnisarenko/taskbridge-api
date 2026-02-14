/*
  Warnings:

  - A unique constraint covering the columns `[owner_user_id,title]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "projects_owner_user_id_title_key" ON "projects"("owner_user_id", "title");
