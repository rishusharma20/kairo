import { prisma } from '../src/lib/db';
import { encryptKey, decryptKey } from '../src/lib/services/encryption';
import readline from 'readline';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  let encryptionKey = process.env.GEMINI_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.log("GEMINI_ENCRYPTION_KEY env var not found. Prompting interactively...");
    encryptionKey = await askQuestion("Enter GEMINI_ENCRYPTION_KEY (32 chars): ");
    process.env.GEMINI_ENCRYPTION_KEY = encryptionKey;
  }

  if (!encryptionKey || encryptionKey.length !== 32) {
    console.error("Error: GEMINI_ENCRYPTION_KEY must be exactly 32 characters long.");
    process.exit(1);
  }

  // Verify encryption/decryption works with the key
  try {
    const testPlain = "kairo-encryption-verification-test-string";
    const testEnc = encryptKey(testPlain);
    const testDec = decryptKey(testEnc);
    if (testDec !== testPlain) {
      throw new Error("Decrypted value does not match original plaintext.");
    }
    console.log("GEMINI_ENCRYPTION_KEY successfully verified.");
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Error: GEMINI_ENCRYPTION_KEY validation failed. Encryption/Decryption verification error:", errMsg);
    process.exit(1);
  }

  // Load keys
  const keysToProvision: string[] = [];
  for (let i = 1; i <= 4; i++) {
    let key = process.env[`GEMINI_KEY_${i}`];
    if (!key) {
      key = await askQuestion(`Enter Gemini API Key ${i} (or press Enter to skip): `);
    }
    if (key && key.trim().length > 0) {
      keysToProvision.push(key.trim());
    }
  }

  if (keysToProvision.length === 0) {
    console.error("Error: No Gemini keys were supplied.");
    process.exit(1);
  }

  console.log(`Validating and preparing to provision ${keysToProvision.length} keys...`);

  // Fetch existing keys to prevent duplicates
  const existingKeys = await prisma.geminiKey.findMany();
  const decryptedExisting = new Set<string>();

  for (const k of existingKeys) {
    try {
      const decrypted = decryptKey(k.encrypted_api_key);
      decryptedExisting.add(decrypted);
    } catch {
      console.warn(`Warning: Failed to decrypt existing key ID ${k.id}. Skipping duplicate check for this key.`);
    }
  }

  let provisionedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < keysToProvision.length; i++) {
    const rawKey = keysToProvision[i];

    // 1. Safe structural input validation
    if (typeof rawKey !== 'string') {
      console.error(`Error: Key index ${i + 1} is not a string.`);
      process.exit(1);
    }
    if (rawKey.length === 0) {
      console.error(`Error: Key index ${i + 1} is empty.`);
      process.exit(1);
    }
    if (/\s/.test(rawKey)) {
      console.error(`Error: Key index ${i + 1} contains invalid internal whitespace or newlines.`);
      process.exit(1);
    }
    if (rawKey.length < 20 || rawKey.length > 200) {
      console.error(`Error: Key index ${i + 1} length (${rawKey.length}) is outside the expected 20-200 character range.`);
      process.exit(1);
    }

    // 2. Prevent duplicate provisioning
    if (decryptedExisting.has(rawKey)) {
      console.log(`Key ${i + 1} already exists in database. Skipping.`);
      skippedCount++;
      continue;
    }

    // 3. Encrypt key
    const encrypted = encryptKey(rawKey);

    // 4. Store in DB
    const newKey = await prisma.geminiKey.create({
      data: {
        encrypted_api_key: encrypted,
        status: 'AVAILABLE',
        priority: 0,
        failure_count: 0,
      },
      select: {
        id: true,
        status: true,
      }
    });

    console.log(`Successfully provisioned key ${i + 1}: ID = ${newKey.id}, Status = ${newKey.status}`);
    provisionedCount++;
  }

  console.log(`Provisioning completed. Successfully provisioned: ${provisionedCount}, Skipped/Duplicates: ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error("Fatal error during provisioning:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
