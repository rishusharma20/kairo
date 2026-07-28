import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { encryptKey, generateKeyFingerprint } from '@/lib/services/encryption';
import { backfillFingerprints } from '../../scripts/backfill-key-fingerprints';

vi.mock('@/lib/db', () => ({
  prisma: {
    geminiKey: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  }
}));

const mockExit = vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error('process.exit called'); }) as any);

describe('Backfill Fingerprints Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully backfills four valid NULL fingerprints (dry-run and execute)', async () => {
    const keys = Array.from({ length: 4 }).map((_, i) => ({
      id: `key-${i}`,
      encrypted_api_key: encryptKey(`test-key-${i}`),
      key_fingerprint: null
    }));

    vi.mocked(prisma.geminiKey.findMany)
      // First query for NULL fingerprints
      .mockResolvedValueOnce(keys as any)
      // Second query for existing collisions
      .mockResolvedValueOnce([]);

    // DRY RUN
    await backfillFingerprints(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    vi.mocked(prisma.geminiKey.findMany)
      .mockResolvedValueOnce(keys as any)
      .mockResolvedValueOnce([]);

    // EXECUTE
    await backfillFingerprints(true);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    
    // Check that we're generating correct Prisma update promises
    const updates = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as any[];
    expect(updates.length).toBe(4);
    expect(prisma.geminiKey.update).toHaveBeenCalledTimes(4); // the mapped array creates these
  });

  it('is idempotent (rerun does nothing)', async () => {
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce([]);
    
    const consoleSpy = vi.spyOn(console, 'log');
    await backfillFingerprints(true);
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0 credentials requiring backfill'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('aborts when duplicate found among NULL credentials', async () => {
    const plaintext = 'duplicate-key-123';
    const keys = [
      { id: '1', encrypted_api_key: encryptKey(plaintext), key_fingerprint: null },
      { id: '2', encrypted_api_key: encryptKey(plaintext), key_fingerprint: null }
    ];
    
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce(keys as any);

    const consoleSpy = vi.spyOn(console, 'error');
    await expect(backfillFingerprints(true)).rejects.toThrow('process.exit called');
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FATAL: Detected 1 duplicate(s)'));
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('aborts when collision with existing fingerprint occurs', async () => {
    const plaintext = 'collision-key';
    const fingerprint = generateKeyFingerprint(plaintext);
    
    const keys = [
      { id: 'new-1', encrypted_api_key: encryptKey(plaintext), key_fingerprint: null }
    ];
    
    vi.mocked(prisma.geminiKey.findMany)
      // First query for NULL fingerprints
      .mockResolvedValueOnce(keys as any)
      // Second query for existing collisions
      .mockResolvedValueOnce([{ id: 'existing-1', key_fingerprint: fingerprint } as any]);

    const consoleSpy = vi.spyOn(console, 'error');
    await expect(backfillFingerprints(true)).rejects.toThrow('process.exit called');
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FATAL: Detected 1 collision(s)'));
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('aborts on decryption failure safely', async () => {
    const keys = [
      { id: 'bad-1', encrypted_api_key: 'malformed:garbage', key_fingerprint: null }
    ];
    
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce(keys as any);

    const consoleSpy = vi.spyOn(console, 'error');
    await expect(backfillFingerprints(true)).rejects.toThrow('process.exit called');
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FATAL: Failed to decrypt credential ID'));
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
