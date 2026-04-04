-- CreateTable
CREATE TABLE "task_completion_rejections" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "rejection_number" INTEGER NOT NULL,
    "feedback" VARCHAR(2000),
    "rejected_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_completion_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_completion_rejections_task_id_rejection_number_key" ON "task_completion_rejections"("task_id", "rejection_number");

-- CreateIndex
CREATE INDEX "task_completion_rejections_task_id_created_at_idx" ON "task_completion_rejections"("task_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "task_completion_rejections" ADD CONSTRAINT "task_completion_rejections_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completion_rejections" ADD CONSTRAINT "task_completion_rejections_rejected_by_user_id_fkey" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
