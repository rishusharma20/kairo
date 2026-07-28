-- AlterTable
ALTER TABLE "gemini_keys" ADD COLUMN     "project_id" TEXT;

-- CreateTable
CREATE TABLE "provider_projects" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_project_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_projects_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gemini_keys" ADD CONSTRAINT "gemini_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "provider_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
