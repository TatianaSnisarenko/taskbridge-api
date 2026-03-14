-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('not_started', 'skipped', 'completed');

-- CreateTable
CREATE TABLE "user_onboarding_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Persona" NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'not_started',
    "version" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMPTZ(6),
    "skipped_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_states_user_id_role_key" ON "user_onboarding_states"("user_id", "role");

-- CreateIndex
CREATE INDEX "user_onboarding_states_user_id_idx" ON "user_onboarding_states"("user_id");

-- AddForeignKey
ALTER TABLE "user_onboarding_states" ADD CONSTRAINT "user_onboarding_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
