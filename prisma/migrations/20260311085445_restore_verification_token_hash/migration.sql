/*
  Warnings:

  - A unique constraint covering the columns `[token_hash]` on the table `verification_tokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token_hash` to the `verification_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "token_hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");
