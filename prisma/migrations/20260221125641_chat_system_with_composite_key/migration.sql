/*
  Warnings:

  - You are about to alter the column `text` on the `chat_messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.

*/
-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "text" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "chat_threads" ADD COLUMN     "last_message_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "chat_thread_reads" (
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_thread_reads_pkey" PRIMARY KEY ("thread_id","user_id")
);

-- CreateIndex
CREATE INDEX "chat_thread_reads_user_id_idx" ON "chat_thread_reads"("user_id");

-- CreateIndex
CREATE INDEX "chat_threads_company_user_id_last_message_at_idx" ON "chat_threads"("company_user_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_threads_developer_user_id_last_message_at_idx" ON "chat_threads"("developer_user_id", "last_message_at" DESC);

-- AddForeignKey
ALTER TABLE "chat_thread_reads" ADD CONSTRAINT "chat_thread_reads_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread_reads" ADD CONSTRAINT "chat_thread_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
