import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSharedAiRoute, type RouterTelemetry } from '@/lib/services/ai-router';
import * as poolService from '@/lib/services/pool';
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
  getHealthyCredentialsForProject: vi.fn(),
  getHealthyCredentialsForModel: vi.fn(),
  markKeyUsed: vi.fn(),
  markKeyCooldown: vi.fn(),
  markKeyDisabled: vi.fn(),
}));

// Phase 19: No longer need discovery mock — router uses getHealthyCredentialsForModel
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

// Helper: mock getHealthyCredentialsForModel to return credentials for a specific model
function mockCredentialsForModel(mapping: Record<string, Array<{ id: string; project_id: string; failure_count?: number; last_used_at?: Date | null; encrypted_api_key?: string }>>) {
  vi.mocked(poolService.getHealthyCredentialsForModel).mockImplementation(async (modelId: string) => {
    return (mapping[modelId] || []).map(c => ({
      ...c,
      encrypted_api_key: c.encrypted_api_key || 'enc',
      failure_count: c.failure_count ?? 0,
      last_used_at: c.last_used_at ?? null,
    })) as never[];
  });
}

describe('AI Router Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
  });

  // TEST A
  it('TEST A: Project A, Key A1, Model 1 -> success. 1 provider call, returns response', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA' }]
    });

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

  // TEST B: Model failover — model 1 returns 404, model 2 succeeds
  it('TEST B: Model 1 unavailable, Model 2 success. Updates route, returns Model 2', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA' }],
      'gemini-3.6-flash': [{ id: 'A1', project_id: 'ProjA' }]
    });

    mockGenerateContent
      .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // model 1 fails
      .mockResolvedValueOnce({ response: { text: () => 'model 2 success' } }); // model 2 succeeds

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('model 2 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(prisma.projectModelAvailability.update).toHaveBeenCalledWith({
      where: { project_id_model_id: { project_id: 'ProjA', model_id: 'gemini-3.5-flash-lite' } },
      data: { status: "UNAVAILABLE" }
    });
    expect(telemetry[0].result).toBe('FAILURE');
    expect(telemetry[0].failureCategory).toBe('MODEL_NOT_FOUND');
    expect(telemetry[1].result).toBe('SUCCESS');
  });

  // TEST C: Invalid credential (401)
  it('TEST C: Invalid credential (401), next eligible credential selected', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA' },
        { id: 'B1', project_id: 'ProjB' }
      ]
    });

    mockGenerateContent
      .mockRejectedValueOnce({ status: 401, message: 'Invalid API key' })
      .mockResolvedValueOnce({ response: { text: () => 'B1 success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('B1 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(poolService.markKeyDisabled).toHaveBeenCalledWith('A1');
    expect(telemetry.length).toBe(2);
    expect(telemetry[1].credentialId).toBe('B1');
  });

  // TEST C2: 403 Permission Error
  it('TEST C2: 403 Permission Error excludes project but does not disable credential', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA' },
        { id: 'B1', project_id: 'ProjB' }
      ]
    });

    mockGenerateContent
      .mockRejectedValueOnce({ status: 403, message: 'Permission denied' })
      .mockResolvedValueOnce({ response: { text: () => 'B1 success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('B1 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(poolService.markKeyDisabled).not.toHaveBeenCalled();
    expect(telemetry.length).toBe(2);
    expect(telemetry[1].credentialId).toBe('B1');
  });

  // TEST D: 429 project exclusion
  it('TEST D: Confirmed project-level failure (429), skips sibling key, moves to next project', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA' },
        { id: 'A2', project_id: 'ProjA' },
        { id: 'B1', project_id: 'ProjB' }
      ]
    });

    mockGenerateContent
      .mockRejectedValueOnce({ status: 429, message: 'Too many requests' })
      .mockResolvedValueOnce({ response: { text: () => 'ProjB success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('ProjB success');
    // Interleaving: A1, B1, A2 — A1 fails (429, exclude ProjA), B1 succeeds
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(poolService.markKeyCooldown).toHaveBeenCalledWith('A1', ROUTER_CONFIG.COOLDOWN_MINUTES);
    expect(telemetry[1].credentialId).toBe('B1');
    expect(telemetry[1].projectId).toBe('ProjB');
  });

  // TEST E: 400 Bad Request stops immediately
  it('TEST E: 400 Request error stops immediately, no failover', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA' },
        { id: 'B1', project_id: 'ProjB' }
      ]
    });

    mockGenerateContent.mockRejectedValueOnce({ status: 400, message: 'Bad request payload' });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/400 Bad Request/);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // TEST E2: 400 Bad Request model-specific recovers
  it('TEST E2: 400 Request error recovers if model-specific', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA' },
        { id: 'B1', project_id: 'ProjB' }
      ]
    });

    mockGenerateContent
      .mockRejectedValueOnce({ status: 400, message: 'Model is not supported' })
      .mockResolvedValueOnce({ response: { text: () => 'B1 success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(text).toBe('B1 success');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(telemetry[0].failureCategory).toBe('BAD_REQUEST');
  });

  // TEST F: 5xx allows fallback
  it('TEST F: Temporary 5xx allows fallback, no infinite loop', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA', failure_count: 0 }],
      'gemini-3.6-flash': [{ id: 'A1', project_id: 'ProjA', failure_count: 0 }]
    });

    mockGenerateContent
      .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
      .mockResolvedValueOnce({ response: { text: () => 'success after 500' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(text).toBe('success after 500');
    expect(telemetry[0].failureCategory).toBe('TEMPORARY_BACKEND');
    expect(prisma.geminiKey.update).not.toHaveBeenCalled(); // No failure_count increment in Phase 19.1
  });

  // TEST G: Total failure respects attempt limits
  it('TEST G: Total failure respects attempt limits and throws AI_UNAVAILABLE', async () => {
    // Give many credentials so the global limit is what stops it
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'K1', project_id: 'P1', failure_count: 0 },
        { id: 'K2', project_id: 'P2', failure_count: 0 },
        { id: 'K3', project_id: 'P3', failure_count: 0 },
      ],
      'gemini-3.6-flash': [
        { id: 'K1', project_id: 'P1', failure_count: 0 },
        { id: 'K2', project_id: 'P2', failure_count: 0 },
        { id: 'K3', project_id: 'P3', failure_count: 0 },
      ]
    });

    mockGenerateContent.mockRejectedValue({ status: 503, message: 'Service Unavailable' });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
    
    // Should stop at MAX_TOTAL_ATTEMPTS (5)
    expect(mockGenerateContent).toHaveBeenCalledTimes(ROUTER_CONFIG.MAX_TOTAL_ATTEMPTS);
  });

  // TEST H: LRU distribution
  it('TEST H: Two equivalent healthy credentials — LRU credential selected first', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA', last_used_at: null },  // Never used = LRU
        { id: 'B1', project_id: 'ProjB', last_used_at: new Date('2026-07-30T10:00:00Z') }
      ]
    });

    mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

    await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(poolService.markKeyUsed).toHaveBeenCalledWith('A1');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // TEST I/J: No models available
  it('TEST I/J: No models available → AI_UNAVAILABLE, no provider calls', async () => {
    mockCredentialsForModel({}); // No credentials for any model

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  // TEST DEC_A: Decryption failure failover
  it('TEST DEC_A: Credential A decrypt throws, Credential B valid, Provider success.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad' },
        { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc_good' }
      ]
    });

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
    
    const logStr = JSON.stringify(telemetry);
    expect(logStr).not.toContain('enc_bad');
    expect(logStr).not.toContain('Auth tag mismatch');
  });

  // TEST DEC_B: All credentials in project fail decryption
  // Phase 19: With interleaving, order is A1(ProjA), B1(ProjB), A2(ProjA)
  // A1 fails decrypt → B1 succeeds before A2 is reached
  it('TEST DEC_B: Project A key fails decrypt, B succeeds via interleaving.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [
        { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad1' },
        { id: 'A2', project_id: 'ProjA', encrypted_api_key: 'enc_bad2' },
        { id: 'B1', project_id: 'ProjB', encrypted_api_key: 'enc_good' }
      ]
    });

    vi.mocked(encryptionService.decryptKey).mockImplementation((key) => {
      if (key.startsWith('enc_bad')) throw new Error('Bad key');
      return 'decrypted_good';
    });

    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'B1 success' } });

    const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(text).toBe('B1 success');
    // Interleaved order: A1(ProjA) → decrypt fail, B1(ProjB) → success
    // A2 is never reached because B1 succeeds first
    expect(telemetry.length).toBe(2);
    expect(telemetry[0].failureCategory).toBe('DECRYPTION_ERROR');
    expect(telemetry[0].credentialId).toBe('A1');
    expect(telemetry[1].result).toBe('SUCCESS');
    expect(telemetry[1].credentialId).toBe('B1');
  });

  // TEST DEC_C: All credentials fail decryption
  it('TEST DEC_C: All credentials fail decryption, throws AI_UNAVAILABLE.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad' }]
    });

    vi.mocked(encryptionService.decryptKey).mockImplementation(() => {
      throw new Error('Bad key');
    });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    
    const { logSystemEvent } = await import('@/lib/services/audit');
    expect(logSystemEvent).toHaveBeenCalled();
    
    const calls = vi.mocked(logSystemEvent).mock.calls;
    const payload = calls[0]?.[2] as { telemetry?: RouterTelemetry[] } | undefined;
    expect(payload?.telemetry?.[0].failureCategory).toBe('DECRYPTION_ERROR');
  });

  // TEST DEC_D: Secret safety
  it('TEST DEC_D: Telemetry logs contain no sensitive info upon decryption crash.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA', encrypted_api_key: 'super_secret_cipher' }]
    });

    process.env.GEMINI_ENCRYPTION_KEY = 'super_secret_key_environment';

    vi.mocked(encryptionService.decryptKey).mockImplementation(() => {
      throw new Error('Raw crypto error iv authTag');
    });

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow();

    const { logSystemEvent } = await import('@/lib/services/audit');
    const calls = vi.mocked(logSystemEvent).mock.calls;
    const payload = calls[0]?.[2] as { telemetry?: RouterTelemetry[] } | undefined;
    
    const logStr = JSON.stringify(payload?.telemetry);
    expect(logStr).not.toContain('super_secret_cipher');
    expect(logStr).not.toContain('super_secret_key_environment');
    expect(logStr).not.toContain('Raw crypto error');
    expect(logStr).not.toContain('iv');
    expect(logStr).not.toContain('authTag');
  });

  // TEST TEL_B: Successful provider route persists telemetry
  it('TEST TEL_B: Successful provider route persists telemetry.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA' }]
    });
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted_key');
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'success text' } });

    const result = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(result.text).toBe('success text');

    const { logSystemEvent } = await import('@/lib/services/audit');
    expect(logSystemEvent).toHaveBeenCalled();
  });

  // TEST TEL_C: Telemetry DB failure does NOT change successful inference result
  it('TEST TEL_C: Telemetry DB failure does NOT change successful inference result.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA' }]
    });
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted_key');
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'success text 2' } });

    const { logSystemEvent } = await import('@/lib/services/audit');
    vi.mocked(logSystemEvent).mockRejectedValueOnce(new Error('DB failure'));

    const result = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    expect(result.text).toBe('success text 2');
  });

  // TEST TEL_D: Telemetry DB failure during complete routing failure
  it('TEST TEL_D: Telemetry DB failure during complete routing failure still results in AI_UNAVAILABLE.', async () => {
    mockCredentialsForModel({
      'gemini-3.5-flash-lite': [{ id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc_bad' }]
    });
    vi.mocked(encryptionService.decryptKey).mockImplementation(() => {
      throw new Error('Bad key');
    });

    const { logSystemEvent } = await import('@/lib/services/audit');
    vi.mocked(logSystemEvent).mockRejectedValueOnce(new Error('DB failure'));

    await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
  });
});
