import { prisma } from '../src/lib/db';
import crypto from 'crypto';

const GEMINI_ENCRYPTION_KEY = process.env.GEMINI_ENCRYPTION_KEY;

function decryptKey(encryptedHex: string): string {
  if (!GEMINI_ENCRYPTION_KEY) {
    throw new Error('GEMINI_ENCRYPTION_KEY is required for decryption');
  }
  
  const buffer = Buffer.from(encryptedHex, 'hex');
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encryptedText = buffer.subarray(32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(GEMINI_ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function backfillFingerprints() {
  if (!GEMINI_ENCRYPTION_KEY) {
    console.error("FATAL: GEMINI_ENCRYPTION_KEY is missing in environment.");
    process.exit(1);
  }

  console.log("Starting key_fingerprint backfill...");

  // Only select keys that don't have a fingerprint yet
  const keys = await prisma.geminiKey.findMany({
    where: { key_fingerprint: null }
  });

  console.log(`Found ${keys.length} credentials requiring backfill.`);

  let updatedCount = 0;
  let duplicateCount = 0;

  for (const key of keys) {
    try {
      // 1. Decrypt
      const plaintext = decryptKey(key.encrypted_api_key);
      
      // 2. Compute fingerprint
      const fingerprint = crypto.createHash('sha256').update(plaintext).digest('hex');

      // 3. Verify uniqueness before updating
      const existing = await prisma.geminiKey.findUnique({
        where: { key_fingerprint: fingerprint }
      });

      if (existing) {
        console.warn(`DUPLICATE DETECTED: Credential ${key.id} produces a fingerprint already owned by ${existing.id}. Skipping.`);
        duplicateCount++;
        continue;
      }

      // 4. Update
      await prisma.geminiKey.update({
        where: { id: key.id },
        data: { key_fingerprint: fingerprint }
      });
      
      updatedCount++;
    } catch (err) {
      console.error(`Failed to backfill credential ${key.id}:`, err);
    }
  }

  console.log(`Backfill complete. Updated: ${updatedCount}. Duplicates skipped: ${duplicateCount}.`);
}

backfillFingerprints()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
