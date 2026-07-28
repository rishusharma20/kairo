-- AlterTable
ALTER TABLE "gemini_keys" ADD COLUMN     "key_fingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gemini_keys_key_fingerprint_key" ON "gemini_keys"("key_fingerprint");
