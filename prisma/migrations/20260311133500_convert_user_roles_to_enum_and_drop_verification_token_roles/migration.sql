-- Ensure USER baseline role before enum cast
UPDATE "users"
SET "roles" = array_append("roles", 'USER')
WHERE NOT ('USER' = ANY("roles"));

-- Convert users.roles from TEXT[] to UserRole[]
ALTER TABLE "users"
ALTER COLUMN "roles" DROP DEFAULT;

ALTER TABLE "users"
ALTER COLUMN "roles" TYPE "UserRole"[] USING ("roles"::"UserRole"[]),
ALTER COLUMN "roles" SET DEFAULT ARRAY['USER']::"UserRole"[];

-- verification_tokens no longer store role metadata
ALTER TABLE "verification_tokens"
DROP COLUMN IF EXISTS "role",
DROP COLUMN IF EXISTS "roles";
