import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { executeSharedAiRoute } from '@/lib/services/ai-router';
import * as poolService from '@/lib/services/pool';
import * as encryptionService from '@/lib/services/encryption';
import * as modelsService from '@/lib/services/models';

vi.mock('@/lib/db', () => ({
  prisma: {
    projectModelAvailability: { update: vi.fn() },
    geminiKey: { update: vi.fn() }
  }
}));

vi.mock('@/lib/services/pool', () => ({
  getHealthyCredentialsForModel: vi.fn(),
  markKeyUsed: vi.fn(),
}));

vi.mock('@/lib/services/encryption', () => ({
  decryptKey: vi.fn(),
}));

vi.mock('@/lib/services/models', () => ({
  getEnabledModels: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  logSystemEvent: vi.fn(),
}));

const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent
      };
    }
  }
}));

describe('Multimodal Input Hardening (Phase 20.2.1)', () => {
  let routeSource = '';

  beforeEach(() => {
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'extension', 'query', 'route.ts');
    routeSource = fs.readFileSync(routePath, 'utf-8');

    vi.resetAllMocks();

    (modelsService.getEnabledModels as any).mockReturnValue([{ id: 'gemini-1.5-flash', priority: 1 }]);

    (poolService.getHealthyCredentialsForModel as any).mockResolvedValue([
      { id: 'key1', project_id: 'proj1', encrypted_api_key: 'enc1', last_used_at: new Date() }
    ]);
    (encryptionService.decryptKey as any).mockReturnValue('decrypted_key');
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Mocked response' }
    });
  });

  describe('API Boundary Hardening (Static)', () => {
    it('MULTIMODAL_API_A: Rejects screenshot if not string', () => {
      expect(routeSource).toContain("typeof screenshot !== 'string'");
      expect(routeSource).toContain('Invalid type for screenshot');
    });

    it('MULTIMODAL_API_B: Rejects screenshot if over 5MB payload limit', () => {
      // 5 * 1024 * 1024 = 5242880
      expect(routeSource).toContain('5242880');
      expect(routeSource).toContain('Screenshot exceeds maximum allowed size');
    });

    it('MULTIMODAL_API_C: Rejects malformed data URLs (must be jpeg, png, or webp)', () => {
      expect(routeSource).toContain('(jpeg|png|webp);base64,');
      expect(routeSource).toContain('Invalid screenshot format');
    });

    it('MULTIMODAL_API_D: Screenshot is optional', () => {
      expect(routeSource).toContain('if (screenshot !== undefined) {');
    });
  });

  describe('Router MIME and Multimodal Handling', () => {
    it('MULTIMODAL_ROUTER_A: Dynamically extracts MIME type for JPEG', async () => {
      await executeSharedAiRoute(
        'GENERAL',
        'page',
        'test query',
        undefined,
        'context',
        'data:image/jpeg;base64,somebase64data'
      );

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg[1].inlineData.mimeType).toBe('image/jpeg');
      expect(callArg[1].inlineData.data).toBe('somebase64data');
    });

    it('MULTIMODAL_ROUTER_B: Dynamically extracts MIME type for PNG', async () => {
      await executeSharedAiRoute(
        'GENERAL',
        'page',
        'test query',
        undefined,
        'context',
        'data:image/png;base64,pngbase64data'
      );

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg[1].inlineData.mimeType).toBe('image/png');
      expect(callArg[1].inlineData.data).toBe('pngbase64data');
    });

    it('MULTIMODAL_ROUTER_C: Generates content using one combined array if screenshot exists', async () => {
      await executeSharedAiRoute(
        'GENERAL',
        'page',
        'test query',
        undefined,
        'context',
        'data:image/jpeg;base64,data'
      );

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(Array.isArray(callArg)).toBe(true);
      expect(callArg.length).toBe(2);
      expect(typeof callArg[0]).toBe('string');
      expect(callArg[1]).toHaveProperty('inlineData');
    });

    it('MULTIMODAL_ROUTER_D: No screenshot keeps text-only inference working', async () => {
      await executeSharedAiRoute(
        'GENERAL',
        'page',
        'test query',
        undefined,
        'context',
        undefined
      );

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(typeof callArg).toBe('string');
      expect(Array.isArray(callArg)).toBe(false);
    });
  });
});
