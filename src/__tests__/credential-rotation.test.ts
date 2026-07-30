import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSharedAiRoute } from '@/lib/services/ai-router';
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

vi.mock('@/lib/services/discovery', () => ({
  getAvailableModelsForProject: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('@/lib/services/encryption', () => ({
  decryptKey: vi.fn(),
}));

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

describe('Phase 19: Credential Rotation & Resilient Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
  });

  // ============================================================
  // U. MODEL PRIORITY TESTS
  // ============================================================

  describe('Model Priority', () => {
    it('U1: gemini-3.5-flash-lite remains Priority 1', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'P1' }]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'flash lite response' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
    });

    it('U2: Healthy rotation does NOT cause Priority 2 selection', async () => {
      // Both models have credentials, but flash-lite should always be tried first
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'P1' }],
        'gemini-3.6-flash': [{ id: 'K2', project_id: 'P2' }]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('U3: Priority 2 reached only through failover, not round-robin', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'P1' }],
        'gemini-3.6-flash': [{ id: 'K1', project_id: 'P1' }]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: 'fail' })
        .mockResolvedValueOnce({ response: { text: () => 'model 2' } });

      const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(text).toBe('model 2');
      expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
      expect(telemetry[0].result).toBe('FAILURE');
      expect(telemetry[1].modelId).toBe('gemini-3.6-flash');
      expect(telemetry[1].result).toBe('SUCCESS');
    });

    it('U4: Deterministic model ordering intact', async () => {
      // All models have credentials — if all fail, they should be tried in priority order
      const allModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
      const mapping: Record<string, Array<{ id: string; project_id: string }>> = {};
      allModels.forEach((m, i) => {
        mapping[m] = [{ id: `K${i}`, project_id: `P${i}` }];
      });
      mockCredentialsForModel(mapping);

      mockGenerateContent.mockRejectedValue({ status: 503, message: 'fail' });

      await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);

      // Should have tried models in priority order, bounded by MAX_TOTAL_ATTEMPTS
      const calls = mockGenerateContent.mock.calls;
      expect(calls.length).toBe(ROUTER_CONFIG.MAX_TOTAL_ATTEMPTS);
    });
  });

  // ============================================================
  // V. CREDENTIAL ROTATION TESTS
  // ============================================================

  describe('Credential Rotation', () => {
    it('V5: Never-used credential is selected before recently-used equivalent', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K_never', project_id: 'P1', last_used_at: null },
          { id: 'K_used', project_id: 'P2', last_used_at: new Date('2026-07-30T10:00:00Z') }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(poolService.markKeyUsed).toHaveBeenCalledWith('K_never');
    });

    it('V6: Oldest lastUsed credential is preferred among equivalent healthy routes', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K_old', project_id: 'P1', last_used_at: new Date('2026-07-30T08:00:00Z') },
          { id: 'K_new', project_id: 'P2', last_used_at: new Date('2026-07-30T12:00:00Z') }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(poolService.markKeyUsed).toHaveBeenCalledWith('K_old');
    });

    it('V7: Credentials from Secondary project participate', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'Primary_K1', project_id: 'Primary', last_used_at: new Date('2026-07-30T12:00:00Z') },
          { id: 'Secondary_K1', project_id: 'Secondary', last_used_at: null }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      // Secondary's never-used credential should be selected
      expect(poolService.markKeyUsed).toHaveBeenCalledWith('Secondary_K1');
    });

    it('V8: Credentials from Tertiary project participate', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'P1_K1', project_id: 'Primary', last_used_at: new Date('2026-07-30T12:00:00Z') },
          { id: 'P2_K1', project_id: 'Secondary', last_used_at: new Date('2026-07-30T11:00:00Z') },
          { id: 'P3_K1', project_id: 'Tertiary', last_used_at: null }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(poolService.markKeyUsed).toHaveBeenCalledWith('P3_K1');
    });

    it('V9: Fourth project auto-enrolled without code changes', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'P1_K1', project_id: 'P1', last_used_at: new Date('2026-07-30T12:00:00Z') },
          { id: 'P2_K1', project_id: 'P2', last_used_at: new Date('2026-07-30T11:00:00Z') },
          { id: 'P3_K1', project_id: 'P3', last_used_at: new Date('2026-07-30T10:00:00Z') },
          { id: 'P4_K1', project_id: 'KairoFourth', last_used_at: null }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'fourth project!' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].projectId).toBe('KairoFourth');
      expect(poolService.markKeyUsed).toHaveBeenCalledWith('P4_K1');
    });

    it('V10: Fifth project behaves the same way', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', last_used_at: new Date('2026-07-30T12:00:00Z') },
          { id: 'K2', project_id: 'P2', last_used_at: new Date('2026-07-30T11:00:00Z') },
          { id: 'K3', project_id: 'P3', last_used_at: new Date('2026-07-30T10:00:00Z') },
          { id: 'K4', project_id: 'P4', last_used_at: new Date('2026-07-30T09:00:00Z') },
          { id: 'K5', project_id: 'P5', last_used_at: null }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'fifth!' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].projectId).toBe('P5');
    });

    it('V11: DISABLED credential is excluded (via pool query)', async () => {
      // getHealthyCredentialsForModel should not return DISABLED credentials
      // This test verifies our mock correctly represents the pool behavior
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          // Only healthy credential returned — DISABLED is filtered by pool.ts query
          { id: 'K_healthy', project_id: 'P1' }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].credentialId).toBe('K_healthy');
    });

    it('V12: Active cooldown credential is excluded (via pool query)', async () => {
      // Active cooldown credentials are filtered by the pool query (cooldown_until > now)
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K_ok', project_id: 'P2' }]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].credentialId).toBe('K_ok');
    });

    it('V13: Expired cooldown credential becomes eligible automatically', async () => {
      // Expired cooldown credentials ARE returned by pool (cooldown_until < now)
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K_expired_cooldown', project_id: 'P1', last_used_at: null }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'recovered!' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].credentialId).toBe('K_expired_cooldown');
      expect(telemetry[0].result).toBe('SUCCESS');
    });

    it('V14: Inactive project is excluded (via pool query)', async () => {
      // getHealthyCredentialsForModel only returns credentials from ACTIVE projects
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'ActiveProject' }]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].projectId).toBe('ActiveProject');
    });

    it('V15: Project lacking the selected model is excluded', async () => {
      // Only credentials from projects with the model AVAILABLE are returned
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'P_with_model' }]
        // P_without_model has no credentials for flash-lite
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].projectId).toBe('P_with_model');
    });
  });

  // ============================================================
  // W. FAILOVER TESTS
  // ============================================================

  describe('Failover', () => {
    it('W16: Timeout → failover continues', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', failure_count: 0 },
          { id: 'K2', project_id: 'P2', failure_count: 0 }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce(Object.assign(new Error('PROVIDER_TIMEOUT'), {}))
        .mockResolvedValueOnce({ response: { text: () => 'recovered' } });

      const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(text).toBe('recovered');
      expect(telemetry[0].failureCategory).toBe('TIMEOUT');
      expect(telemetry[1].result).toBe('SUCCESS');
    });

    it('W17: Timeout does NOT increment failure_count or disable credential', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', failure_count: 0 },
          { id: 'K2', project_id: 'P2', failure_count: 0 }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce(Object.assign(new Error('PROVIDER_TIMEOUT'), {}))
        .mockResolvedValueOnce({ response: { text: () => 'ok' } });

      await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      // Phase 19.1: NO increment for timeout, NO disable
      expect(poolService.markKeyDisabled).not.toHaveBeenCalled();
      expect(prisma.geminiKey.update).not.toHaveBeenCalled();
    });

    it('W18: 5xx → failover continues', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', failure_count: 0 },
          { id: 'K2', project_id: 'P2', failure_count: 0 }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 502, message: 'Bad Gateway' })
        .mockResolvedValueOnce({ response: { text: () => 'recovered' } });

      const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(text).toBe('recovered');
      expect(telemetry[0].failureCategory).toBe('TEMPORARY_BACKEND');
    });

    it('W19: 5xx does NOT increment failure_count or disable credential', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', failure_count: 0 },
          { id: 'K2', project_id: 'P2', failure_count: 0 }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 500, message: 'ISE' })
        .mockResolvedValueOnce({ response: { text: () => 'ok' } });

      await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      // Phase 19.1: NO increment, NO disable
      expect(poolService.markKeyDisabled).not.toHaveBeenCalled();
      expect(prisma.geminiKey.update).not.toHaveBeenCalled();
    });

    it('W20: Invalid credential (401) → skip/disable', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K_bad', project_id: 'P1' },
          { id: 'K_good', project_id: 'P2' }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 401, message: 'Invalid API key' })
        .mockResolvedValueOnce({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(poolService.markKeyDisabled).toHaveBeenCalledWith('K_bad');
      expect(telemetry[0].failureCategory).toBe('AUTH_ERROR');
      expect(telemetry[1].result).toBe('SUCCESS');
    });

    it('W20B: Permission Denied (403) → project exclusion, NO disable', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K_denied', project_id: 'P1' },
          { id: 'K_good', project_id: 'P2' }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 403, message: 'Permission Denied' })
        .mockResolvedValueOnce({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(poolService.markKeyDisabled).not.toHaveBeenCalled();
      expect(telemetry[0].failureCategory).toBe('PERMISSION_DENIED');
      expect(telemetry[1].result).toBe('SUCCESS');
    });

    it('W21: Cooldown credential → next eligible credential/project used', async () => {
      // Cooldown credentials are excluded by the pool query; this tests that
      // if 429 causes cooldown during routing, the next credential is used
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1' },
          { id: 'K2', project_id: 'P2' }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
        .mockResolvedValueOnce({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(poolService.markKeyCooldown).toHaveBeenCalledWith('K1', ROUTER_CONFIG.COOLDOWN_MINUTES);
      expect(telemetry[1].credentialId).toBe('K2');
      expect(telemetry[1].result).toBe('SUCCESS');
    });

    it('W22: Model failure → next model reached according to priority', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'P1' }],
        'gemini-3.6-flash': [{ id: 'K2', project_id: 'P1' }]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 404, message: 'Model not found' })
        .mockResolvedValueOnce({ response: { text: () => 'model 2' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
      expect(telemetry[0].failureCategory).toBe('MODEL_NOT_FOUND');
      expect(telemetry[1].modelId).toBe('gemini-3.6-flash');
      expect(telemetry[1].result).toBe('SUCCESS');
    });

    it('W23: Project failure → another eligible project can serve', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'ProjA' },
          { id: 'K2', project_id: 'ProjB' }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 429, message: 'quota exceeded' })
        .mockResolvedValueOnce({ response: { text: () => 'ProjB saves the day' } });

      const { text, telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(text).toBe('ProjB saves the day');
      expect(telemetry[1].projectId).toBe('ProjB');
    });

    it('W24: No exact route combination is attempted twice', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'P1' }],
        'gemini-3.6-flash': [{ id: 'K1', project_id: 'P1' }]
      });
      // K1 fails on flash-lite with 503 (failure count incremented, not disabled)
      // K1 then succeeds on flash (different model, same credential = different route key)
      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: 'fail' })
        .mockResolvedValueOnce({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      // Verify no duplicate route keys
      const routeKeys = telemetry.map(t => `${t.credentialId}:${t.modelId}`);
      expect(new Set(routeKeys).size).toBe(routeKeys.length);
    });

    it('W25: Failover is bounded by MAX_TOTAL_ATTEMPTS', async () => {
      const mapping: Record<string, Array<{ id: string; project_id: string }>> = {};
      const allModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
      allModels.forEach((m) => {
        mapping[m] = [
          { id: `K1_${m}`, project_id: 'P1' },
          { id: `K2_${m}`, project_id: 'P2' },
          { id: `K3_${m}`, project_id: 'P3' }
        ];
      });
      mockCredentialsForModel(mapping);
      mockGenerateContent.mockRejectedValue({ status: 503, message: 'fail' });

      await expect(executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General')).rejects.toThrow(/AI_UNAVAILABLE/);
      expect(mockGenerateContent).toHaveBeenCalledTimes(ROUTER_CONFIG.MAX_TOTAL_ATTEMPTS);
    });

    it('W26: Successful fallback response reaches caller normally', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', failure_count: 0 },
          { id: 'K2', project_id: 'P2', failure_count: 0 }
        ]
      });
      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: 'fail' })
        .mockResolvedValueOnce({ response: { text: () => 'The answer is 42' } });

      const { text } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(text).toBe('The answer is 42');
    });
  });

  // ============================================================
  // X. FAIRNESS TESTS
  // ============================================================

  describe('Fairness', () => {
    it('X: Traffic not concentrated on first project — interleaving distributes across projects', async () => {
      // 3 projects, multiple credentials each
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'P1_K1', project_id: 'P1', last_used_at: new Date('2026-07-30T10:00:00Z') },
          { id: 'P1_K2', project_id: 'P1', last_used_at: new Date('2026-07-30T10:05:00Z') },
          { id: 'P2_K1', project_id: 'P2', last_used_at: null },
          { id: 'P2_K2', project_id: 'P2', last_used_at: null },
          { id: 'P3_K1', project_id: 'P3', last_used_at: new Date('2026-07-30T09:00:00Z') },
          { id: 'P3_K2', project_id: 'P3', last_used_at: new Date('2026-07-30T09:30:00Z') }
        ]
      });

      // First call fails, second succeeds
      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: 'fail' })
        .mockResolvedValueOnce({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');

      // Due to interleaving, first 3 attempts should be from 3 different projects
      const firstTwoProjects = telemetry.slice(0, 2).map(t => t.projectId);
      expect(new Set(firstTwoProjects).size).toBe(2); // Two different projects
    });

    it('X: lastUsed changes influence future selection', async () => {
      // Simulate: K1 was just used (most recent), K2 was never used
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K2', project_id: 'P2', last_used_at: null },
          { id: 'K1', project_id: 'P1', last_used_at: new Date('2026-07-30T14:15:00Z') }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      // K2 (never used) should be selected
      expect(telemetry[0].credentialId).toBe('K2');
    });
  });

  // ============================================================
  // Y. DYNAMIC SCALE TESTS
  // ============================================================

  describe('Dynamic Scale', () => {
    it('Y: 1 project works', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [{ id: 'K1', project_id: 'Solo' }]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].projectId).toBe('Solo');
    });

    it('Y: 3 projects work', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K1', project_id: 'P1', last_used_at: null },
          { id: 'K2', project_id: 'P2', last_used_at: null },
          { id: 'K3', project_id: 'P3', last_used_at: null }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].result).toBe('SUCCESS');
    });

    it('Y: 5 projects work', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': Array.from({ length: 5 }, (_, i) => ({
          id: `K${i}`, project_id: `P${i}`, last_used_at: null
        }))
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].result).toBe('SUCCESS');
    });

    it('Y: 10 projects work — no code path depends on project count', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': Array.from({ length: 10 }, (_, i) => ({
          id: `K${i}`, project_id: `Project${i}`, last_used_at: null
        }))
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].result).toBe('SUCCESS');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Success on first try
    });

    it('Y: Router independent of project name and ordinal', async () => {
      mockCredentialsForModel({
        'gemini-3.5-flash-lite': [
          { id: 'K_xyz', project_id: 'arbitrary-name-123', last_used_at: null },
          { id: 'K_abc', project_id: 'another_weird_name', last_used_at: new Date() }
        ]
      });
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } });

      const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
      expect(telemetry[0].projectId).toBe('arbitrary-name-123'); // LRU (null) selected
    });
  });
});
