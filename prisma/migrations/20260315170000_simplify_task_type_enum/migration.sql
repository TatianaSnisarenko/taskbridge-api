-- Simplify TaskType enum to PAID and VOLUNTEER only.
-- Existing values UNPAID and EXPERIENCE are mapped to VOLUNTEER.

ALTER TYPE "TaskType" RENAME TO "TaskType_old";

CREATE TYPE "TaskType" AS ENUM ('PAID', 'VOLUNTEER');

ALTER TABLE "tasks"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "TaskType"
  USING (
    CASE
      WHEN "type"::text = 'PAID' THEN 'PAID'::"TaskType"
      ELSE 'VOLUNTEER'::"TaskType"
    END
  ),
  ALTER COLUMN "type" SET DEFAULT 'VOLUNTEER';

DROP TYPE "TaskType_old";
