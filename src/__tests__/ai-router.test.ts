import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSharedAiRoute, type RouterTelemetry } from '@/lib/services/ai-router';
import * as poolService from '@/lib/services/pool';
import * as discoveryService from '@/lib/services/discovery';
import * as encryptionService from '@/lib/services/encryption';
import { prisma } from '@/lib/db';
import { ROUTER_CONFIG } from '@/lib/services/ai-router.config';

vi.mock('@/lib/db', () => ({
  prisma: {
    projectModelAvailability: { update: vi.fn() },
    geminiKey: { update: vi.fn() }
  }
}));

vi.mock('@/lib/services/pool', () => ({
  getHealthyCredentials: vi.fn(),
  markKeyUsed: vi.fn(),
  markKeyCooldown: vi.fn(),
  markKeyDisabled: vi.fn(),
}));

vi.mock('@/lib/services/discovery', () => ({
  getAvailableModelsForProject: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('@/lib/services/encryption', () => ({
  decryptKey: vi.fn(),
}));

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: (...args: unknown[]) => mockGenerateContent(...args)
        };
      }
    }
  };
});

describe('AI Router Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
  });

  // TEST A
  it('TEST A: Project A, Key A1, Model 1 -> success. 1 provider call, returns response', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'success response' }
    });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('success response');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(telemetry.length).toBe(1);
    expect(telemetry[0].result).toBe('SUCCESS');
    expect(telemetry[0].attemptNumber).toBe(1);
    expect(poolService.markKeyUsed).toHaveBeenCalledWith('A1');
  });

  // TEST B
  it('TEST B: Model 1 unavailable, Model 2 success. Updates route, returns Model 2', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-2', enabled: true, priority: 2, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // model 1 fails
      .mockResolvedValueOnce({ response: { text: () => 'model 2 success' } }); // model 2 succeeds

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('model 2 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(prisma.projectModelAvailability.update).toHaveBeenCalledWith({
      where: { project_id_model_id: { project_id: 'ProjA', model_id: 'model-1' } },
      data: { status: "UNAVAILABLE" }
    });
    expect(telemetry[0].result).toBe('FAILURE');
    expect(telemetry[0].failureCategory).toBe('MODEL_NOT_FOUND');
    expect(telemetry[1].result).toBe('SUCCESS');
  });

  // TEST C
  it('TEST C: Invalid credential (401), remaining models skipped, next eligible credential selected', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never,
      { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-2', enabled: true, priority: 2, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 401, message: 'Invalid API key' }) // A1 model 1 fails
      .mockResolvedValueOnce({ response: { text: () => 'B1 success' } }); // B1 model 1 succeeds

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('B1 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2); // A1m1, B1m1
    expect(poolService.markKeyDisabled).toHaveBeenCalledWith('A1');
    expect(telemetry.length).toBe(2);
    expect(telemetry[1].credentialId).toBe('B1');
  });

  // TEST D
  it('TEST D: Confirmed project-level failure (429), does not waste attempt on sibling key, moves to next project', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never,
      { id: 'A2', project_id: 'ProjA', encrypted_api_key: 'enc' } as never,
      { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 429, message: 'Too many requests' }) // ProjA A1 fails project-wide
      .mockResolvedValueOnce({ response: { text: () => 'ProjB success' } }); // ProjB B1 succeeds

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('ProjB success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2); // A1, then skips A2, then B1
    expect(poolService.markKeyCooldown).toHaveBeenCalledWith('A1', ROUTER_CONFIG.COOLDOWN_MINUTES);
    expect(telemetry[1].credentialId).toBe('B1');
    expect(telemetry[1].projectId).toBe('ProjB');
  });

  // TEST E
  it('TEST E: 400 Request error stops immediately, no failover', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never,
      { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent.mockRejectedValueOnce({ status: 400, message: 'Bad request payload' });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/400 Bad Request/);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Stopped instantly
  });

  // TEST F
  it('TEST F: Temporary 5xx allows fallback, no infinite loop', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', failure_count: 0, encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-2', enabled: true, priority: 2, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
      .mockResolvedValueOnce({ response: { text: () => 'success after 500' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(text).toBe('success after 500');
    expect(telemetry[0].failureCategory).toBe('TEMPORARY_BACKEND');
    expect(prisma.geminiKey.update).toHaveBeenCalledWith({ where: { id: 'A1' }, data: { failure_count: { increment: 1 } } });
  });

  // TEST G
  it('TEST G: Total failure respects attempt limits and throws AI_UNAVAILABLE', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', failure_count: 0, encrypted_api_key: 'enc' } as never
    ]);
    // Supply more than MAX_MODELS_PER_CREDENTIAL to see if limits hold
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-2', enabled: true, priority: 2, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-3', enabled: true, priority: 3, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-4', enabled: true, priority: 4, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-5', enabled: true, priority: 5, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } },
      { id: 'model-6', enabled: true, priority: 6, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent.mockRejectedValue({ status: 503, message: 'Service Unavailable' });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
    
    // MAX_MODELS_PER_CREDENTIAL is 5 now, so it should stop at 5
    expect(mockGenerateContent).toHaveBeenCalledTimes(ROUTER_CONFIG.MAX_MODELS_PER_CREDENTIAL);
  });

  // TEST H
  it('TEST H: Two equivalent healthy credentials distributed appropriately via LRU', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never, // Comes first = LRU
      { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

    await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    // Should pick the first one (ProjA A1) because the pool query is already ordered by priority desc, last_used_at asc
    expect(poolService.markKeyUsed).toHaveBeenCalledWith('A1');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // TEST I & J
  it('TEST I/J: UNKNOWN and UNAVAILABLE models are never selected (because they are filtered out by getAvailableModelsForProject)', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc' } as never
    ]);
    // discoveryService explicitly does not return UNAVAILABLE or UNKNOWN models by design
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([]);

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  // TEST DEC_A: FIRST CREDENTIAL DECRYPTION FAILURE
  it('TEST DEC_A: Credential A decrypt throws, Credential B valid, Provider success. DECRYPTION_ERROR telemetry exists.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad' } as never,
      { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc_good' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    vi.mocked(encryptionService.decryptKey).mockImplementation((key) => {
      if (key === 'enc_bad') throw new Error('Auth tag mismatch');
      return 'decrypted_good';
    });

    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'B1 success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('B1 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(telemetry.length).toBe(2);
    expect(telemetry[0].failureCategory).toBe('DECRYPTION_ERROR');
    expect(telemetry[0].credentialId).toBe('A1');
    expect(telemetry[1].credentialId).toBe('B1');
    expect(telemetry[1].result).toBe('SUCCESS');
    
    // Check that we didn't log sensitive info
    const logStr = JSON.stringify(telemetry);
    expect(logStr).not.toContain('enc_bad');
    expect(logStr).not.toContain('Auth tag mismatch');
  });

  // TEST DEC_B: ALL CREDENTIALS IN PROJECT FAIL DECRYPTION
  it('TEST DEC_B: Project A keys fail decrypt, Project B succeeds. Fails over correctly.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad1' } as never,
      { id: 'A2', project_id: 'ProjA', encrypted_api_key: 'enc_bad2' } as never,
      { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc_good' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    vi.mocked(encryptionService.decryptKey).mockImplementation((key) => {
      if (key.startsWith('enc_bad')) throw new Error('Bad key');
      return 'decrypted_good';
    });

    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'B1 success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('B1 success');
    expect(telemetry.length).toBe(3);
    expect(telemetry[0].failureCategory).toBe('DECRYPTION_ERROR');
    expect(telemetry[0].credentialId).toBe('A1');
    expect(telemetry[1].failureCategory).toBe('DECRYPTION_ERROR');
    expect(telemetry[1].credentialId).toBe('A2');
    expect(telemetry[2].result).toBe('SUCCESS');
    expect(telemetry[2].credentialId).toBe('B1');
  });

  // TEST DEC_C: ALL CREDENTIALS FAIL DECRYPTION
  it('TEST DEC_C: All credentials fail decryption, throws AI_UNAVAILABLE, records telemetry.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    vi.mocked(encryptionService.decryptKey).mockImplementation(() => {
      throw new Error('Bad key');
    });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
    
    // Ensure mockGenerateContent was never called
    expect(mockGenerateContent).not.toHaveBeenCalled();
    
    // Check if telemetry was logged via logSystemEvent
    const { logSystemEvent } = await import('@/lib/services/audit');
    expect(logSystemEvent).toHaveBeenCalled();
    
    const calls = vi.mocked(logSystemEvent).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const callArgs = calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs?.[0]).toBe('ROUTER_TELEMETRY');
    
    const payload = callArgs?.[2] as { telemetry?: RouterTelemetry[] } | undefined;
    expect(payload).toBeDefined();
    
    const telemetryLogged = payload!.telemetry;
    expect(telemetryLogged).toBeDefined();
    expect(Array.isArray(telemetryLogged)).toBe(true);
    expect(telemetryLogged!.length).toBe(1);
    expect(telemetryLogged![0].failureCategory).toBe('DECRYPTION_ERROR');
  });

  // TEST DEC_D: SECRET SAFETY
  it('TEST DEC_D: Telemetry logs contain no sensitive info upon decryption crash.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'super_secret_cipher' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);

    process.env.GEMINI_ENCRYPTION_KEY = 'super_secret_key_environment';

    vi.mocked(encryptionService.decryptKey).mockImplementation(() => {
      throw new Error('Raw crypto error iv authTag');
    });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow();

    const { logSystemEvent } = await import('@/lib/services/audit');
    const calls = vi.mocked(logSystemEvent).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const callArgs = calls[0];
    expect(callArgs).toBeDefined();
    
    const payload = callArgs?.[2] as { telemetry?: RouterTelemetry[] } | undefined;
    expect(payload).toBeDefined();
    
    const telemetryLogged = payload!.telemetry;
    expect(telemetryLogged).toBeDefined();
    expect(Array.isArray(telemetryLogged)).toBe(true);
    
    const logStr = JSON.stringify(telemetryLogged);
    expect(logStr).not.toContain('super_secret_cipher');
    expect(logStr).not.toContain('super_secret_key_environment');
    expect(logStr).not.toContain('Raw crypto error');
    expect(logStr).not.toContain('iv');
    expect(logStr).not.toContain('authTag');
  });
  // TEST TEL_B: Successful provider route persists telemetry
  it('TEST TEL_B: Successful provider route persists telemetry.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_good' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted_key');
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'success text' } });

    const result = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(result.text).toBe('success text');

    const { logSystemEvent } = await import('@/lib/services/audit');
    expect(logSystemEvent).toHaveBeenCalled();
  });

  // TEST TEL_C: Telemetry DB failure does NOT change successful inference result
  it('TEST TEL_C: Telemetry DB failure does NOT change successful inference result.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_good' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted_key');
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'success text 2' } });

    const { logSystemEvent } = await import('@/lib/services/audit');
    vi.mocked(logSystemEvent).mockRejectedValueOnce(new Error('DB failure'));

    const result = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(result.text).toBe('success text 2');
  });

  // TEST TEL_D: Telemetry DB failure during complete routing failure still results in AI_UNAVAILABLE
  it('TEST TEL_D: Telemetry DB failure during complete routing failure still results in AI_UNAVAILABLE.', async () => {
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad' } as never
    ]);
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue([
      { id: 'model-1', enabled: true, priority: 1, provider: 'google', capabilities: { textOutput: true, mcq: true, coding: true, generalText: true } }
    ]);
    vi.mocked(encryptionService.decryptKey).mockImplementation(() => {
      throw new Error('Bad key');
    });

    const { logSystemEvent } = await import('@/lib/services/audit');
    vi.mocked(logSystemEvent).mockRejectedValueOnce(new Error('DB failure'));

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
  });
});
