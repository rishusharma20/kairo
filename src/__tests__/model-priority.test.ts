import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSharedAiRoute } from '@/lib/services/ai-router';
import * as poolService from '@/lib/services/pool';
import * as discoveryService from '@/lib/services/discovery';
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

describe('Model Priority Routing', () => {
  const models = getEnabledModels(); // This will return the sorted models (Lite, 3.6, 3.5, 31b, 26b)
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
    
    vi.mocked(poolService.getHealthyCredentials).mockResolvedValue([
      { id: 'A1', project_id: 'ProjA', encrypted_api_key: 'enc', failure_count: 0 } as never
    ]);
  });

  it('PRIORITY_A: All five models available, provider succeeds on first attempt', async () => {
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(models);
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.5-flash-lite');
    
    expect(telemetry.length).toBe(1);
    expect(telemetry[0].modelId).toBe('gemini-3.5-flash-lite');
    expect(telemetry[0].result).toBe('SUCCESS');
  });

  it('PRIORITY_B: Lite fails, 3.6 succeeds', async () => {
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(models);
    mockGenerateContent
      .mockRejectedValueOnce({ status: 500, message: 'Server error' }) // Lite fails
      .mockResolvedValueOnce({ response: { text: () => 'success' } }); // 3.6 succeeds

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
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(models);
    mockGenerateContent
      .mockRejectedValueOnce({ status: 500 }) // Lite
      .mockRejectedValueOnce({ status: 500 }) // 3.6
      .mockResolvedValueOnce({ response: { text: () => 'success' } }); // 3.5

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
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(models);
    mockGenerateContent
      .mockRejectedValueOnce({ status: 500 }) // Lite
      .mockRejectedValueOnce({ status: 500 }) // 3.6
      .mockRejectedValueOnce({ status: 500 }) // 3.5
      .mockRejectedValueOnce({ status: 500 }) // 31b
      .mockResolvedValueOnce({ response: { text: () => 'success' } }); // 26b

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

  it('PRIORITY_E: Lite is marked unavailable before routing', async () => {
    // Return all models except Lite
    const availableModels = models.filter(m => m.id !== 'gemini-3.5-flash-lite');
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(availableModels);
    
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'success' } });

    const { telemetry } = await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, 'gemini-3.6-flash');

    expect(telemetry.length).toBe(1);
    expect(telemetry[0].modelId).toBe('gemini-3.6-flash');
  });

  it('PRIORITY_F: Input models shuffled in discovery, router order remains correct', async () => {
    // Deliberately shuffle the models returned by discovery
    const shuffled = [
      models.find(m => m.id === 'gemma-4-26b-a4b-it')!,
      models.find(m => m.id === 'gemini-3.5-flash')!,
      models.find(m => m.id === 'gemini-3.5-flash-lite')!,
      models.find(m => m.id === 'gemma-4-31b-it')!,
      models.find(m => m.id === 'gemini-3.6-flash')!,
    ];
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(shuffled);
    
    mockGenerateContent
      .mockRejectedValueOnce({ status: 500 }) // Lite
      .mockRejectedValueOnce({ status: 500 }) // 3.6
      .mockRejectedValueOnce({ status: 500 }) // 3.5
      .mockRejectedValueOnce({ status: 500 }) // 31b
      .mockResolvedValueOnce({ response: { text: () => 'success' } }); // 26b

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
    vi.mocked(discoveryService.getAvailableModelsForProject).mockResolvedValue(models);
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'success' } });

    await executeSharedAiRoute('GENERAL', 'ask', 'hi', 'General');
    
    // There must be exactly ONE model attempt on the provider
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
  });
});
