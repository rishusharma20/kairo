-- CreateTable
CREATE TABLE "project_model_availability" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_model_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_model_availability_project_id_model_id_key" ON "project_model_availability"("project_id", "model_id");

-- AddForeignKey
ALTER TABLE "project_model_availability" ADD CONSTRAINT "project_model_availability_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "provider_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
