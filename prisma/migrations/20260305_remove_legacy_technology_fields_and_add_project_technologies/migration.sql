-- Drop legacy columns from developer_profiles
ALTER TABLE "developer_profiles" DROP COLUMN "skills";
ALTER TABLE "developer_profiles" DROP COLUMN "tech_stack";

-- Drop legacy column from tasks
ALTER TABLE "tasks" DROP COLUMN "required_skills";

-- Drop legacy column from projects
ALTER TABLE "projects" DROP COLUMN "technologies";

-- Create new project_technologies junction table
CREATE TABLE "project_technologies" (
    "project_id" UUID NOT NULL,
    "technology_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_technologies_pkey" PRIMARY KEY ("project_id","technology_id")
);

-- Add foreign key constraints for project_technologies
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
