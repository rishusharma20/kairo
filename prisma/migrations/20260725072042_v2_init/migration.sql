-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "daily_limit" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "gemini_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encrypted_api_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigned_user_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" DATETIME,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "cooldown_until" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "gemini_keys_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_key_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "gemini_key_id" TEXT NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" DATETIME,
    "release_reason" TEXT,
    CONSTRAINT "user_key_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_key_assignments_gemini_key_id_fkey" FOREIGN KEY ("gemini_key_id") REFERENCES "gemini_keys" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "usage_date" DATETIME NOT NULL,
    "requests_used" INTEGER NOT NULL DEFAULT 0,
    "daily_limit" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gemini_keys_encrypted_api_key_key" ON "gemini_keys"("encrypted_api_key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_usage_user_id_usage_date_key" ON "daily_usage"("user_id", "usage_date");
