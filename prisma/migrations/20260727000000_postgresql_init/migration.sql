-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "daily_limit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan_expires_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gemini_keys" (
    "id" TEXT NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigned_user_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "cooldown_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gemini_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_key_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gemini_key_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "release_reason" TEXT,

    CONSTRAINT "user_key_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "usage_date" TIMESTAMP(3) NOT NULL,
    "requests_used" INTEGER NOT NULL DEFAULT 0,
    "daily_limit" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gemini_keys_encrypted_api_key_key" ON "gemini_keys"("encrypted_api_key");

-- CreateIndex
CREATE INDEX "gemini_keys_assigned_user_id_status_idx" ON "gemini_keys"("assigned_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_usage_user_id_usage_date_key" ON "daily_usage"("user_id", "usage_date");

-- AddForeignKey
ALTER TABLE "gemini_keys" ADD CONSTRAINT "gemini_keys_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_key_assignments" ADD CONSTRAINT "user_key_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_key_assignments" ADD CONSTRAINT "user_key_assignments_gemini_key_id_fkey" FOREIGN KEY ("gemini_key_id") REFERENCES "gemini_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

