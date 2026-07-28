import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { getHealthyCredentials } from '@/lib/services/pool';

vi.mock('@/lib/db', () => ({
  prisma: {
    geminiKey: {
      findMany: vi.fn(),
    }
  }
}));

describe('Shared Pool Service - getHealthyCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return eligible keys excluding DISABLED and active COOLDOWN', async () => {
    const mockDate = new Date('2026-07-28T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    const mockKeys = [
      { id: '1', status: 'AVAILABLE', priority: 10, last_used_at: null, encrypted_api_key: 'enc1' },
      { id: '2', status: 'ACTIVE', priority: 5, last_used_at: null, encrypted_api_key: 'enc2' },
      { id: '3', status: 'COOLDOWN', priority: 0, cooldown_until: new Date('2026-07-28T11:00:00Z'), last_used_at: null, encrypted_api_key: 'enc3' } // Expired cooldown
    ];

    (prisma.geminiKey.findMany as import('vitest').Mock).mockResolvedValue(mockKeys);

    const result = await getHealthyCredentials();

    expect(prisma.geminiKey.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { status: { in: ["AVAILABLE", "ACTIVE", "ASSIGNED"] } },
          {
            status: "COOLDOWN",
            cooldown_until: { lt: mockDate }
          }
        ],
        status: { not: "DISABLED" }
      },
      orderBy: [
        { priority: "desc" },
        { last_used_at: "asc" }
      ]
    });

    expect(result).toEqual(mockKeys);
    expect(result.length).toBe(3);

    // Verify credentials remain encrypted (mock just passes through, but conceptually we test that encrypted_api_key exists and is not decrypted here)
    expect(result[0].encrypted_api_key).toBe('enc1');

    vi.useRealTimers();
  });
});
