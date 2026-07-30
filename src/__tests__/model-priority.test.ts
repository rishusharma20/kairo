import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSharedAiRoute } from '@/lib/services/ai-router';
import * as poolService from '@/lib/services/pool';
import * as encryptionService from '@/lib/services/encryption';
import * as auditService from '@/lib/services/audit';
import { getEnabledModels } from '@/lib/services/models';

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

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel(args: { model: string }) {
        mockGetGenerativeModel(args.model);
        return {
          generateContent: (...args: unknown[]) => mockGenerateContent(...args)
        };
      }
    }
  };
});

// Phase 19: Helper to mock credentials per model
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

describe('Model Priority Routing', () => {
  const models = getEnabledModels();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
  });

  it('PRIORITY_A: All five models available, provider succeeds on first attempt', async () => {
    // Phase 19: credentials available for all models
    const mapping: Record<string, Array<{ id: string; project_id: string }>> = {};
    models.forEach(m => { mapping[m.id] = [{ id: 'A1', project_id: 'ProjA' }]; });
    mockCredentialsForModel(mapping);

    mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.5-flash-lite');
    
    expect(telemetry.length).toBe(1);
    expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
    expect(telemetry[0].result).toBe('SUCCESS');
  });

  it('PRIORITY_B: Lite fails, 3.6 succeeds', async () => {
    const mapping: Record<string, Array<{ id: string; project_id: string; failure_count?: number }>> = {};
    models.forEach(m => { mapping[m.id] = [{ id: 'A1', project_id: 'ProjA', failure_count: 0 }]; });
    mockCredentialsForModel(mapping);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 500, message: 'Server error' })
      .mockResolvedValueOnce({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.5-flash-lite');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(2, 'gemini-3.6-flash');

    expect(telemetry.length).toBe(2);
    expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
    expect(telemetry[1].modelId).toBe('gemini-3.6-flash');
    expect(telemetry[1].result).toBe('SUCCESS');
  });

  it('PRIORITY_C: First two fail, 3.5 succeeds', async () => {
    const mapping: Record<string, Array<{ id: string; project_id: string; failure_count?: number }>> = {};
    models.forEach(m => { mapping[m.id] = [{ id: 'A1', project_id: 'ProjA', failure_count: 0 }]; });
    mockCredentialsForModel(mapping);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(3);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.5-flash-lite');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(2, 'gemini-3.6-flash');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(3, 'gemini-3.5-flash');

    expect(telemetry.length).toBe(3);
    expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
    expect(telemetry[1].modelId).toBe('gemini-3.6-flash');
    expect(telemetry[2].modelId).toBe('gemini-3.5-flash');
  });

  it('PRIORITY_D: First four fail, Final Gemma succeeds', async () => {
    const mapping: Record<string, Array<{ id: string; project_id: string; failure_count?: number }>> = {};
    models.forEach(m => { mapping[m.id] = [{ id: 'A1', project_id: 'ProjA', failure_count: 0 }]; });
    mockCredentialsForModel(mapping);

    mockGenerateContent
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(5);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.5-flash-lite');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(2, 'gemini-3.6-flash');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(3, 'gemini-3.5-flash');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(4, 'gemma-4-31b-it');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(5, 'gemma-4-26b-a4b-it');

    expect(telemetry.length).toBe(5);
    expect(telemetry[4].modelId).toBe('gemma-4-26b-a4b-it');
    expect(telemetry[4].result).toBe('SUCCESS');
  });

  it('PRIORITY_E: Lite has no credentials, next model used', async () => {
    // Phase 19: No credentials for flash-lite, but available for 3.6+
    const mapping: Record<string, Array<{ id: string; project_id: string }>> = {};
    models.filter(m => m.id !== 'gemini-3.5-flash-lite').forEach(m => {
      mapping[m.id] = [{ id: 'A1', project_id: 'ProjA' }];
    });
    mockCredentialsForModel(mapping);
    
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.6-flash');

    expect(telemetry.length).toBe(1);
    expect(telemetry[0].modelId).toBe('gemini-3.6-flash');
  });

  it('PRIORITY_F: Model priority order is deterministic regardless of credential order', async () => {
    // Phase 19: All models have credentials, all fail except last
    const mapping: Record<string, Array<{ id: string; project_id: string; failure_count?: number }>> = {};
    models.forEach(m => { mapping[m.id] = [{ id: 'A1', project_id: 'ProjA', failure_count: 0 }]; });
    mockCredentialsForModel(mapping);
    
    mockGenerateContent
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');

    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.5-flash-lite');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(2, 'gemini-3.6-flash');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(3, 'gemini-3.5-flash');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(4, 'gemma-4-31b-it');
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(5, 'gemma-4-26b-a4b-it');

    expect(telemetry.length).toBe(5);
    expect(telemetry[4].modelId).toBe('gemma-4-26b-a4b-it');
  });

  it('PRIORITY_G: Verify exactly ONE provider request when Lite succeeds', async () => {
    const mapping: Record<string, Array<{ id: string; project_id: string }>> = {};
    models.forEach(m => { mapping[m.id] = [{ id: 'A1', project_id: 'ProjA' }]; });
    mockCredentialsForModel(mapping);

    mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

    await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
  });
});
