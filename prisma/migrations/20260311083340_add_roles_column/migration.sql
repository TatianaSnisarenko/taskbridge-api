/*
  Warnings:

  - You are about to drop the column `token_hash` on the `verification_tokens` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- DropIndex
DROP INDEX "verification_tokens_token_hash_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "verification_tokens" DROP COLUMN "token_hash",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];
