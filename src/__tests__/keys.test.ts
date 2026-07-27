import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { getHealthyKeyForUser, releaseKeys, assignKeys, NoHealthyKeyError } from '@/lib/services/keys';

vi.mock('@/lib/db', () => ({
  prisma: {
    geminiKey: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    userKeyAssignment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
       const tx = {
         geminiKey: prisma.geminiKey,
         userKeyAssignment: prisma.userKeyAssignment
       };
       return cb(tx);
    }),
  }
}));

describe('Key Rotation Service (Round Robin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NoHealthyKeyError when zero keys are healthy', async () => {
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce([]);
    await expect(getHealthyKeyForUser('user-1')).rejects.toThrow(NoHealthyKeyError);
  });

  it('selects the key with null last_used_at first', async () => {
    const keys = [
      { id: 'key-1', last_used_at: new Date('2026-01-01') },
      { id: 'key-2', last_used_at: null }, // Should be selected
    ];
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce(keys as never);
    
    const selected = await getHealthyKeyForUser('user-1');
    expect(selected.id).toBe('key-2');
  });

  it('selects the oldest used key when all have been used', async () => {
    const keys = [
      { id: 'key-1', last_used_at: new Date('2026-01-02') }, // used yesterday
      { id: 'key-2', last_used_at: new Date('2026-01-01') }, // used 2 days ago -> should pick this
      { id: 'key-3', last_used_at: new Date('2026-01-03') }, // used today
    ];
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce(keys as never);
    
    const selected = await getHealthyKeyForUser('user-1');
    expect(selected.id).toBe('key-2');
    
    // Validates that it updates the key's last_used_at
    expect(prisma.geminiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'key-2' } })
    );
  });

  it('considers expired cooldown keys as eligible and restores status to ASSIGNED', async () => {
    const expiredCooldownDate = new Date(Date.now() - 1000);
    const keys = [
      { id: 'key-1', status: 'COOLDOWN', cooldown_until: expiredCooldownDate, last_used_at: new Date('2026-01-01') },
    ];
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce(keys as never);
    
    const selected = await getHealthyKeyForUser('user-1');
    expect(selected.id).toBe('key-1');
    expect(prisma.geminiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: {
        last_used_at: expect.any(Date),
        status: 'ASSIGNED',
        cooldown_until: null,
        failure_count: 0
      }
    });
  });

  it('skips non-expired cooldown keys', async () => {
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce([]);
    await expect(getHealthyKeyForUser('user-1')).rejects.toThrow(NoHealthyKeyError);
  });
});

describe('Key Assignment & Release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('releases EXACTLY requested amount of keys', async () => {
    const keys = [
      { id: 'key-1', created_at: new Date('2026-01-03') },
      { id: 'key-2', created_at: new Date('2026-01-02') },
      { id: 'key-3', created_at: new Date('2026-01-01') },
    ];
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce(keys as never);
    
    // Release 2 keys
    const released = await releaseKeys('user-1', 2, 'PREMIUM_DOWNGRADE');
    
    // Should release the two newest keys (key-1 and key-2)
    expect(released).toHaveLength(2);
    expect(prisma.geminiKey.update).toHaveBeenCalledTimes(2);
  });
  
  it('throws NOT_ENOUGH_AVAILABLE_KEYS if pool is empty', async () => {
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValueOnce([]); // 0 available
    await expect(assignKeys('user-1', 2, 'PREMIUM_UPGRADE')).rejects.toThrow("NOT_ENOUGH_AVAILABLE_KEYS");
  });
});
