import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProjectModels, getAvailableModelsForProject, validateCredentialWithProvider } from '@/lib/services/discovery';
import { prisma } from '@/lib/db';
import * as poolService from '@/lib/services/pool';
import * as encryptionService from '@/lib/services/encryption';

vi.mock('@/lib/db', () => ({
  prisma: {
    projectModelAvailability: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

vi.mock('@/lib/services/pool', () => ({
  getHealthyCredentialsForProject: vi.fn(),
}));

vi.mock('@/lib/services/encryption', () => ({
  decryptKey: vi.fn(),
}));

describe('Discovery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('validateCredentialWithProvider', () => {
    it('returns true for 200 status', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ status: 200 } as Response);
      const res = await validateCredentialWithProvider('some-key');
      expect(res).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?key=some-key'));
    });

    it('returns true for 429 status', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ status: 429 } as Response);
      const res = await validateCredentialWithProvider('some-key');
      expect(res).toBe(true);
    });

    it('returns false and parses structured Google 400 error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        status: 400,
        text: async () => JSON.stringify({
          error: {
            code: 400,
            message: "API key not valid. Please pass a valid API key.",
            status: "INVALID_ARGUMENT"
          }
        })
      } as Response);
      
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const res = await validateCredentialWithProvider('bad-key');
      expect(res).toBe(false);
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('googleStatus=INVALID_ARGUMENT'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('message=API key not valid. Please pass a valid API key.'));
      // Ensure key is NOT logged
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('bad-key'));
    });

    it('returns false and handles malformed/non-JSON 500 error gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        status: 500,
        text: async () => "Internal Server Error Text"
      } as Response);
      
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const res = await validateCredentialWithProvider('some-key');
      expect(res).toBe(false);
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('message=UNPARSEABLE_PROVIDER_ERROR'));
    });

    it('throws error on network failure (fetch throws)', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
      await expect(validateCredentialWithProvider('some-key')).rejects.toThrow('Failed to contact provider for validation');
    });
  });

  describe('validateProjectModels', () => {
    it('does nothing if no healthy keys are found', async () => {
      vi.mocked(poolService.getHealthyCredentialsForProject).mockResolvedValue([]);
      
      await validateProjectModels('proj-1');
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(prisma.projectModelAvailability.upsert).not.toHaveBeenCalled();
    });

    it('handles 429/500 errors by marking all approved models as UNKNOWN', async () => {
      vi.mocked(poolService.getHealthyCredentialsForProject).mockResolvedValue([
        { id: 'key-1', encrypted_api_key: 'enc', project_id: 'proj-1' } as never
      ]);
      vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
      
      vi.mocked(global.fetch).mockResolvedValue({
        status: 500,
        ok: false
      } as Response);

      await validateProjectModels('proj-1');
      
      // Should update exactly 5 models to UNKNOWN
      expect(prisma.projectModelAvailability.upsert).toHaveBeenCalledTimes(5);
      expect(vi.mocked(prisma.projectModelAvailability.upsert).mock.calls[0][0].create.status).toBe('UNKNOWN');
    });

    it('marks models correctly as AVAILABLE or UNAVAILABLE based on API response', async () => {
      vi.mocked(poolService.getHealthyCredentialsForProject).mockResolvedValue([
        { id: 'key-1', encrypted_api_key: 'enc', project_id: 'proj-1' } as never
      ]);
      vi.mocked(encryptionService.decryptKey).mockReturnValue('decrypted');
      
      const mockApiResponse = {
        models: [
          { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
          { name: 'models/gemma-4-31b-it', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['countTokens'] }, // Missing generateContent
          { name: 'models/unknown-model-xyz', supportedGenerationMethods: ['generateContent'] } // Extraneous model
        ]
      };

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockApiResponse
      } as Response);

      await validateProjectModels('proj-1');
      
      // 5 approved models updated in DB
      expect(prisma.projectModelAvailability.upsert).toHaveBeenCalledTimes(5);

      // Verify specific statuses
      const upserts = vi.mocked(prisma.projectModelAvailability.upsert).mock.calls;
      
      const getStatus = (modelId: string) => upserts.find(c => c[0].create.model_id === modelId)?.[0].create.status;

      expect(getStatus('gemini-3.6-flash')).toBe('AVAILABLE');
      expect(getStatus('gemma-4-31b-it')).toBe('AVAILABLE');
      expect(getStatus('gemini-3.5-flash')).toBe('UNAVAILABLE'); // Method missing
      expect(getStatus('gemini-3.5-flash-lite')).toBe('UNAVAILABLE'); // Not returned by API
      expect(getStatus('gemma-4-26b-a4b-it')).toBe('UNAVAILABLE'); // Not returned by API
    });
  });

  describe('getAvailableModelsForProject', () => {
    it('returns models filtered by DB availability and task', async () => {
      vi.mocked(prisma.projectModelAvailability.findMany).mockResolvedValue([
        { model_id: 'gemini-3.6-flash', status: 'AVAILABLE' },
        { model_id: 'gemma-4-26b-a4b-it', status: 'AVAILABLE' }
      ] as never);

      const models = await getAvailableModelsForProject('proj-1', 'CODING');
      
      expect(models.length).toBe(2);
      expect(models[0].id).toBe('gemini-3.6-flash');
      // Ensures priority sorting is maintained (priority 1 then priority 5)
      expect(models[1].id).toBe('gemma-4-26b-a4b-it');
    });
  });
});
