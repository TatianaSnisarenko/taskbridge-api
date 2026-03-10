-- CreateTable
CREATE TABLE "task_favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_favorites_user_id_created_at_idx" ON "task_favorites"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "task_favorites_user_id_task_id_key" ON "task_favorites"("user_id", "task_id");

-- AddForeignKey
ALTER TABLE "task_favorites" ADD CONSTRAINT "task_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_favorites" ADD CONSTRAINT "task_favorites_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
