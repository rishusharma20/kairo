import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { atomicReserveUsage, DailyLimitExceededError } from '@/lib/services/usage';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    dailyUsage: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('Usage Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FREE plan: 0 -> 1 PASS', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-free', daily_limit: 1 } as never);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.dailyUsage.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    await expect(atomicReserveUsage('user-free')).resolves.not.toThrow();

    expect(prisma.dailyUsage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ daily_limit: 1 }),
      update: expect.objectContaining({ daily_limit: 1 }),
    }));
  });

  it('FREE plan: 1 -> reject', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-free', daily_limit: 1 } as never);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.dailyUsage.updateMany).mockResolvedValueOnce({ count: 0 } as never);

    await expect(atomicReserveUsage('user-free')).rejects.toThrow(DailyLimitExceededError);
  });

  it('FREE -> PREMIUM: existing requests_used = 1, old daily_limit = 1, user.daily_limit = 3000, next request -> 2', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-upgrade', daily_limit: 3000 } as never);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.dailyUsage.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    await expect(atomicReserveUsage('user-upgrade')).resolves.not.toThrow();

    expect(prisma.dailyUsage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { daily_limit: 3000 },
      create: expect.objectContaining({ daily_limit: 3000 }),
    }));

    expect(prisma.dailyUsage.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        requests_used: { lt: 3000 }
      })
    }));
  });

  it('PREMIUM: 2999 -> 3000 PASS', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-premium', daily_limit: 3000 } as never);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.dailyUsage.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    await expect(atomicReserveUsage('user-premium')).resolves.not.toThrow();
  });

  it('PREMIUM: 3000 -> reject', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-premium', daily_limit: 3000 } as never);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.dailyUsage.updateMany).mockResolvedValueOnce({ count: 0 } as never);

    await expect(atomicReserveUsage('user-premium')).rejects.toThrow(DailyLimitExceededError);
  });

  it('PREMIUM -> FREE: stored usage limit synchronizes back to 1', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-downgrade', daily_limit: 1 } as never);
    vi.mocked(prisma.dailyUsage.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.dailyUsage.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    await expect(atomicReserveUsage('user-downgrade')).resolves.not.toThrow();

    expect(prisma.dailyUsage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { daily_limit: 1 },
      create: expect.objectContaining({ daily_limit: 1 }),
    }));
  });
});
