-- Add new technology types to existing enum
ALTER TYPE "TechnologyType" ADD VALUE 'FULLSTACK';
ALTER TYPE "TechnologyType" ADD VALUE 'AI_ML';
ALTER TYPE "TechnologyType" ADD VALUE 'UI_UX_DESIGN';
ALTER TYPE "TechnologyType" ADD VALUE 'PRODUCT_MANAGEMENT';
ALTER TYPE "TechnologyType" ADD VALUE 'BUSINESS_ANALYSIS';
ALTER TYPE "TechnologyType" ADD VALUE 'CYBERSECURITY';
ALTER TYPE "TechnologyType" ADD VALUE 'GAME_DEV';
ALTER TYPE "TechnologyType" ADD VALUE 'EMBEDDED';
ALTER TYPE "TechnologyType" ADD VALUE 'TECH_WRITING';

-- Create TechnologySuggestionStatus enum
CREATE TYPE "TechnologySuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create technologies table
CREATE TABLE "technologies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TechnologyType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on slug
CREATE UNIQUE INDEX "technologies_slug_key" ON "technologies"("slug");

-- Create indices on technologies table
CREATE INDEX "technologies_type_popularity_score_idx" ON "technologies"("type", "popularity_score" DESC);
CREATE INDEX "technologies_slug_idx" ON "technologies"("slug");
CREATE INDEX "technologies_is_active_idx" ON "technologies"("is_active");

-- Create developer_technologies table
CREATE TABLE "developer_technologies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "developer_user_id" UUID NOT NULL,
    "technology_id" UUID NOT NULL,
    "proficiency_years" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_technologies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "developer_technologies_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "developer_profiles"("user_id") ON DELETE CASCADE,
    CONSTRAINT "developer_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE
);

-- Create unique constraint on developer_user_id and technology_id
CREATE UNIQUE INDEX "developer_technologies_developer_user_id_technology_id_key" ON "developer_technologies"("developer_user_id", "technology_id");

-- Create index on developer_user_id
CREATE INDEX "developer_technologies_developer_user_id_idx" ON "developer_technologies"("developer_user_id");

-- Create task_technologies table
CREATE TABLE "task_technologies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "technology_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_technologies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "task_technologies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
    CONSTRAINT "task_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE
);

-- Create unique constraint on task_id and technology_id
CREATE UNIQUE INDEX "task_technologies_task_id_technology_id_key" ON "task_technologies"("task_id", "technology_id");

-- Create index on task_id
CREATE INDEX "task_technologies_task_id_idx" ON "task_technologies"("task_id");

-- Create technology_suggestions table
CREATE TABLE "technology_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "technology_id" UUID NOT NULL,
    "suggested_name" TEXT NOT NULL,
    "suggested_slug" TEXT NOT NULL,
    "suggested_type" "TechnologyType" NOT NULL,
    "suggested_by" UUID,
    "status" "TechnologySuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "review_comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "technology_suggestions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "technology_suggestions_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE
);

-- Create indices on technology_suggestions table
CREATE INDEX "technology_suggestions_status_created_at_idx" ON "technology_suggestions"("status", "created_at" DESC);
CREATE INDEX "technology_suggestions_technology_id_idx" ON "technology_suggestions"("technology_id");
