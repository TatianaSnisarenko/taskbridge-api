-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "platform_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_reviews_user_id_created_at_idx" ON "platform_reviews"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_reviews_is_approved_created_at_idx" ON "platform_reviews"("is_approved", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "platform_reviews" ADD CONSTRAINT "platform_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
