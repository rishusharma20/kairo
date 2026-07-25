import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { upgradeToPremium, downgradeToFree } from '@/lib/services/plan';
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

describe('Plan Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upgrade user to premium with 3000 limit', async () => {
    vi.mocked(prisma.user.update).mockResolvedValueOnce({ plan: 'PREMIUM', daily_limit: 3000 } as any);
    const result = await upgradeToPremium('123');
    expect(result.plan).toBe('PREMIUM');
  });

  it('should downgrade user to free with 1 limit', async () => {
    vi.mocked(prisma.user.update).mockResolvedValueOnce({ plan: 'FREE', daily_limit: 1 } as any);
    const result = await downgradeToFree('123');
    expect(result.plan).toBe('FREE');
  });
});

describe('Usage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws InvalidUserStateError if user is BLOCKED', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'BLOCKED' } as any);
    await expect(verifyUsageLimits('123')).rejects.toThrow(InvalidUserStateError);
  });

  it('throws DailyLimitExceededError if limit reached', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE', daily_limit: 1 } as any);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({ requests_used: 1 } as any);
    
    await expect(verifyUsageLimits('123')).rejects.toThrow(DailyLimitExceededError);
  });

  it('returns true successfully if under limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE', daily_limit: 3000 } as any);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({ requests_used: 150 } as any);
    
    const result = await verifyUsageLimits('123');
    expect(result).toBe(true);
  });
});
