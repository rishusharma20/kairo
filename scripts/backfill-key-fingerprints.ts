import { prisma } from '../src/lib/db';
import { decryptKey, generateKeyFingerprint } from '../src/lib/services/encryption';

export async function backfillFingerprints(isExecute: boolean = false) {
  const isDryRun = !isExecute;

  if (isDryRun) {
    console.log("=== DRY RUN MODE: No database mutations will occur ===");
  } else {
    console.log("=== EXECUTE MODE: Database mutations will occur ===");
  }

  console.log("Starting Phase A: READ + COMPUTE");

  // Fetch NULL fingerprint credentials
  const keys = await prisma.geminiKey.findMany({
    where: { key_fingerprint: null }
  });

  if (keys.length === 0) {
    console.log("0 credentials requiring backfill.");
    return;
  }

  console.log(`Found ${keys.length} credentials requiring backfill.`);

  const updates: { id: string; fingerprint: string }[] = [];
  const generatedFingerprints = new Set<string>();
  const duplicatesInBatch: string[] = [];
  
  for (const key of keys) {
    let plaintext: string;
    try {
      plaintext = decryptKey(key.encrypted_api_key);
    } catch (err) {
      console.error(`FATAL: Failed to decrypt credential ID: ${key.id}. Aborting.`);
      process.exit(1);
    }

    const fingerprint = generateKeyFingerprint(plaintext);
    
    // Check for duplicates in the current batch
    if (generatedFingerprints.has(fingerprint)) {
      duplicatesInBatch.push(key.id);
    } else {
      generatedFingerprints.add(fingerprint);
    }

    updates.push({ id: key.id, fingerprint });
  }

  console.log("Starting Phase B: VALIDATE");

  if (duplicatesInBatch.length > 0) {
    console.error(`FATAL: Detected ${duplicatesInBatch.length} duplicate(s) among rows being backfilled.`);
    console.error("Affected Credential IDs:", duplicatesInBatch.join(", "));
    console.error("ABORTING entire backfill.");
    process.exit(1);
  }

  // Check for collisions with existing non-null fingerprints in DB
  const existingKeys = await prisma.geminiKey.findMany({
    where: { key_fingerprint: { in: Array.from(generatedFingerprints) } }
  });

  if (existingKeys.length > 0) {
    console.error(`FATAL: Detected ${existingKeys.length} collision(s) with existing non-null fingerprints.`);
    console.error("Affected Credential IDs (Existing):", existingKeys.map(k => k.id).join(", "));
    console.error("ABORTING entire backfill.");
    process.exit(1);
  }

  console.log("Validation complete. No duplicates or collisions detected.");

  if (isDryRun) {
    console.log(`DRY RUN: Would update ${updates.length} credentials.`);
    console.log("=== DRY RUN COMPLETE ===");
    return;
  }

  console.log("Starting Phase C: WRITE");

  try {
    // Atomic write using Prisma transaction
    await prisma.$transaction(
      updates.map(update => 
        prisma.geminiKey.update({
          where: { id: update.id },
          data: { key_fingerprint: update.fingerprint }
        })
      )
    );
    console.log(`Successfully backfilled ${updates.length} credentials in an atomic transaction.`);
  } catch (err) {
    console.error("FATAL: Transaction failed during write phase.");
    process.exit(1);
  }
}

if (require.main === module || process.argv[1].endsWith('backfill-key-fingerprints.ts')) {
  const isExecute = process.argv.includes('--execute');
  backfillFingerprints(isExecute)
    .catch(e => {
      console.error("Unhandled exception.");
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
