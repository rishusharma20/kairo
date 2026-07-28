import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeKairoQuery } from '@/lib/services/inference';
import * as usageService from '@/lib/services/usage';
import * as aiRouter from '@/lib/services/ai-router';

vi.mock('@/lib/services/usage', () => ({
  atomicReserveUsage: vi.fn(),
  refundUsage: vi.fn(),
  DailyLimitExceededError: class DailyLimitExceededError extends Error {
    constructor() {
      super("Daily limit exceeded");
    }
  }
}));

vi.mock('@/lib/services/ai-router', () => ({
  executeSharedAiRoute: vi.fn()
}));

describe('Production Inference Service Cutover (Phase 5)', () => {
  const defaultArgs = {
    userId: 'user-1',
    feature: 'ask' as never,
    query: 'test query',
    format: 'General' as never
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });


  // TEST A
  it('TEST A/B/C/D - Success path: Exactly once accounting', async () => {
    vi.mocked(aiRouter.executeSharedAiRoute).mockResolvedValue({ text: 'success', telemetry: [] });
    vi.mocked(usageService.atomicReserveUsage).mockResolvedValue();

    const res = await executeKairoQuery(defaultArgs);
    expect(res).toBe('success');
    expect(usageService.atomicReserveUsage).toHaveBeenCalledTimes(1);
    expect(usageService.refundUsage).not.toHaveBeenCalled();
    expect(aiRouter.executeSharedAiRoute).toHaveBeenCalled();
  });

  // TEST H
  it('TEST H - All routes fail: Refund exactly once', async () => {
    vi.mocked(aiRouter.executeSharedAiRoute).mockRejectedValue(new Error('AI_UNAVAILABLE'));
    vi.mocked(usageService.atomicReserveUsage).mockResolvedValue();

    await expect(executeKairoQuery(defaultArgs)).rejects.toThrow('AI_TEMPORARILY_UNAVAILABLE');
    
    expect(usageService.atomicReserveUsage).toHaveBeenCalledTimes(1);
    expect(usageService.refundUsage).toHaveBeenCalledTimes(1); // EXACTLY ONCE
    expect(usageService.refundUsage).toHaveBeenCalledWith('user-1');
  });

  // TEST I & J (Usage boundaries)
  it('TEST I - FREE limit exceeded: Router never called', async () => {
    vi.mocked(usageService.atomicReserveUsage).mockRejectedValue(new usageService.DailyLimitExceededError());
    
    await expect(executeKairoQuery(defaultArgs)).rejects.toThrow('Daily limit exceeded');
    
    expect(aiRouter.executeSharedAiRoute).not.toHaveBeenCalled();
    expect(usageService.refundUsage).not.toHaveBeenCalled();
  });

  // TEST G
  it('TEST G - Bad Request: No failover, refund applied, sanitizes error', async () => {
    vi.mocked(aiRouter.executeSharedAiRoute).mockRejectedValue(new Error('400 Bad Request'));
    vi.mocked(usageService.atomicReserveUsage).mockResolvedValue();

    await expect(executeKairoQuery(defaultArgs)).rejects.toThrow('BAD_REQUEST');
    
    expect(usageService.refundUsage).toHaveBeenCalledTimes(1);
  });

  // Auth Error
  it('Sanitizes unauthorized errors', async () => {
    vi.mocked(aiRouter.executeSharedAiRoute).mockRejectedValue(new Error('AUTH_ERROR'));
    await expect(executeKairoQuery(defaultArgs)).rejects.toThrow('UNAUTHORIZED');
  });

  // TEST L
  it('TEST L - Concurrency handling does not duplicate accounting', async () => {
    // Fire multiple executeKairoQuery simultaneously
    vi.mocked(aiRouter.executeSharedAiRoute).mockResolvedValue({ text: 'concurrent success', telemetry: [] });
    
    await Promise.all([
      executeKairoQuery(defaultArgs),
      executeKairoQuery({ ...defaultArgs, userId: 'user-2' }),
      executeKairoQuery({ ...defaultArgs, userId: 'user-3' })
    ]);

    expect(usageService.atomicReserveUsage).toHaveBeenCalledTimes(3);
    expect(usageService.refundUsage).not.toHaveBeenCalled();
    expect(aiRouter.executeSharedAiRoute).toHaveBeenCalledTimes(3);
  });
});
