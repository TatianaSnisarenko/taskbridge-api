-- AlterTable
ALTER TABLE "chat_message_attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "important_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "notifications_user_id_important_at_idx" ON "notifications"("user_id", "important_at");
