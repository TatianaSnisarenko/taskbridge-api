-- CreateTable
CREATE TABLE "chat_message_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_message_attachments_message_id_created_at_idx" ON "chat_message_attachments"("message_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_message_attachments" ADD CONSTRAINT "chat_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;