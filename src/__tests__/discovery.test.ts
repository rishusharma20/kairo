import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProjectModels, getAvailableModelsForProject } from '@/lib/services/discovery';
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
