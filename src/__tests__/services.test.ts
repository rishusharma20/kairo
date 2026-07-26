import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { changeUserTier } from '@/lib/services/plan';
import { verifyUsageLimits, DailyLimitExceededError, InvalidUserStateError } from '@/lib/services/usage';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    dailyUsage: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

vi.mock('@/lib/services/keys', () => ({
  assignKeys: vi.fn(),
  releaseKeys: vi.fn(),
}));

describe('Plan Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upgrade user to PREMIUM_7_DAYS with 3000 limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: '123', plan: 'FREE' } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({ plan: 'PREMIUM_7_DAYS', daily_limit: 3000 } as never);
    const result = await changeUserTier('123', 'PREMIUM_7_DAYS');
    expect(result.plan).toBe('PREMIUM_7_DAYS');
  });

  it('should downgrade user to FREE with 1 limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: '123', plan: 'PREMIUM_7_DAYS' } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({ plan: 'FREE', daily_limit: 1 } as never);
    const result = await changeUserTier('123', 'FREE');
    expect(result.plan).toBe('FREE');
  });
});

describe('Usage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws InvalidUserStateError if user is BLOCKED', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'BLOCKED' } as never);
    await expect(verifyUsageLimits('123')).rejects.toThrow(InvalidUserStateError);
  });

  it('throws DailyLimitExceededError if limit reached', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE', daily_limit: 1, daily_usages: [{ requests_used: 1 }] } as never);
    
    await expect(verifyUsageLimits('123')).rejects.toThrow(DailyLimitExceededError);
  });

  it('returns limit successfully if under limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE', daily_limit: 3000, daily_usages: [{ requests_used: 150 }] } as never);
    
    const result = await verifyUsageLimits('123');
    expect(result).toEqual({ daily_limit: 3000 });
  });
});
