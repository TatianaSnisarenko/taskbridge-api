-- Backfill users.roles from legacy users.role when roles are empty
UPDATE "users"
SET "roles" = ARRAY["role"::text]
WHERE ("roles" IS NULL OR cardinality("roles") = 0)
  AND "role" IS NOT NULL;

-- Ensure USER baseline role
UPDATE "users"
SET "roles" = array_append("roles", 'USER')
WHERE NOT ('USER' = ANY("roles"));

-- Backfill verification_tokens.roles from legacy verification_tokens.role when roles are empty
UPDATE "verification_tokens"
SET "roles" = ARRAY["role"::text]
WHERE ("roles" IS NULL OR cardinality("roles") = 0)
  AND "role" IS NOT NULL;

-- Ensure USER baseline role in verification tokens
UPDATE "verification_tokens"
SET "roles" = array_append("roles", 'USER')
WHERE NOT ('USER' = ANY("roles"));

ALTER TABLE "users"
ALTER COLUMN "roles" SET DEFAULT ARRAY['USER']::TEXT[],
DROP COLUMN IF EXISTS "role";

ALTER TABLE "verification_tokens"
ALTER COLUMN "roles" SET DEFAULT ARRAY['USER']::TEXT[],
DROP COLUMN IF EXISTS "role";
