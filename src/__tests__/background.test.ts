import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runInBackground } from '@/lib/services/background';

// Suppress console.error and console.warn during these tests
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Background Execution Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes a successful task without retrying', async () => {
    const taskMock = vi.fn().mockResolvedValue(undefined);
    await runInBackground('test-success', taskMock, 3, 1);
    expect(taskMock).toHaveBeenCalledTimes(1);
  });

  it('retries exactly maxRetries times on failure', async () => {
    const taskMock = vi.fn().mockRejectedValue(new Error("Database lock"));
    
    // Original call (1) + retries (2) = 3 total calls
    await runInBackground('test-retry', taskMock, 2, 1);
    
    expect(taskMock).toHaveBeenCalledTimes(3);
  });

  it('succeeds on a subsequent retry', async () => {
    const taskMock = vi.fn()
      .mockRejectedValueOnce(new Error("Network fail"))
      .mockResolvedValueOnce(undefined);
      
    await runInBackground('test-recover', taskMock, 3, 1);
    
    expect(taskMock).toHaveBeenCalledTimes(2);
  });
});
