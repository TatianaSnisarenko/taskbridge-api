-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "TaskDifficulty" AS ENUM ('JUNIOR', 'MIDDLE', 'SENIOR', 'ANY');

-- CreateEnum
CREATE TYPE "TaskDuration" AS ENUM ('DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS');

-- CreateEnum
CREATE TYPE "TaskVisibility" AS ENUM ('PUBLIC', 'UNLISTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Persona" AS ENUM ('developer', 'company');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_CREATED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'COMPLETION_REQUESTED', 'TASK_COMPLETED', 'REVIEW_CREATED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "device_info" TEXT,
    "ip" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "primary_role" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "experience_level" "ExperienceLevel",
    "location" TEXT,
    "timezone" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" "Availability",
    "preferred_task_categories" "TaskCategory"[] DEFAULT ARRAY[]::"TaskCategory"[],
    "portfolio_url" TEXT,
    "github_url" TEXT,
    "linkedin_url" TEXT,
    "avg_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_type" "CompanyType",
    "description" TEXT NOT NULL DEFAULT '',
    "team_size" INTEGER,
    "country" TEXT,
    "timezone" TEXT,
    "contact_email" TEXT,
    "website_url" TEXT,
    "links" JSONB NOT NULL DEFAULT '{}',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "avg_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TaskCategory",
    "type" "TaskType" NOT NULL DEFAULT 'EXPERIENCE',
    "difficulty" "TaskDifficulty",
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimated_effort_hours" INTEGER,
    "expected_duration" "TaskDuration",
    "communication_language" TEXT,
    "timezone_preference" TEXT,
    "application_deadline" DATE,
    "visibility" "TaskVisibility" NOT NULL DEFAULT 'PUBLIC',
    "deliverables" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT NOT NULL DEFAULT '',
    "nice_to_have" TEXT NOT NULL DEFAULT '',
    "accepted_application_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "developer_user_id" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "message" TEXT,
    "proposed_plan" TEXT,
    "availability_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "company_user_id" UUID NOT NULL,
    "developer_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "sender_persona" "Persona",
    "text" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tasks_accepted_application_id_key" ON "tasks"("accepted_application_id");

-- CreateIndex
CREATE INDEX "tasks_status_published_at_idx" ON "tasks"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_owner_user_id_created_at_idx" ON "tasks"("owner_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "applications_task_id_created_at_idx" ON "applications"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "applications_developer_user_id_created_at_idx" ON "applications"("developer_user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "applications_task_id_developer_user_id_key" ON "applications"("task_id", "developer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_threads_task_id_key" ON "chat_threads"("task_id");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_sent_at_idx" ON "chat_messages"("thread_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_target_user_id_created_at_idx" ON "reviews"("target_user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_task_id_author_user_id_key" ON "reviews"("task_id", "author_user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_accepted_application_id_fkey" FOREIGN KEY ("accepted_application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
