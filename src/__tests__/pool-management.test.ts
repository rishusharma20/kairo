import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as ProjectPost } from '@/app/api/admin/projects/route';
import { PATCH as ProjectPatch } from '@/app/api/admin/projects/[id]/route';
import { POST as CredentialPost } from '@/app/api/admin/credentials/route';
import { PATCH as CredentialPatch } from '@/app/api/admin/credentials/[id]/route';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    providerProject: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    geminiKey: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/audit', () => ({
  logSystemEventInBackground: vi.fn(),
}));

vi.mock('@/lib/services/discovery', () => ({
  validateCredentialWithProvider: vi.fn(),
  validateProjectModels: vi.fn(),
}));

// Create authenticated admin requests
const createAdminRequest = (url: string, method: string, body: any) => {
  vi.mocked(getSession).mockResolvedValue({ 
    email: process.env.ADMIN_EMAIL || "admin@gmail.com",
    adminSecondFactorVerified: true
  } as any);
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
};
const createUnauthorizedRequest = (url: string, method: string, body: any) => {
  vi.mocked(getSession).mockResolvedValue(null);
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
};

describe('Provider Pool Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Management', () => {
    it('creates a project successfully if external id is unique', async () => {
      vi.mocked(prisma.providerProject.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.providerProject.create).mockResolvedValue({ id: 'p1', display_name: 'Test', external_project_id: 'ext-1', provider: 'GOOGLE_GEMINI', status: 'ACTIVE' } as any);

      const req = createAdminRequest('http://localhost:3000/api/admin/projects', 'POST', { display_name: 'Test', external_project_id: 'ext-1' });
      const res = await ProjectPost(req as any);
      const json = await res.json();
      
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('p1');
    });

    it('rejects duplicate external project ID', async () => {
      vi.mocked(prisma.providerProject.findFirst).mockResolvedValue({ id: 'p1' } as any);
      
      const req = createAdminRequest('http://localhost:3000/api/admin/projects', 'POST', { display_name: 'Test', external_project_id: 'ext-1' });
      const res = await ProjectPost(req as any);
      const json = await res.json();

      expect(json.success).toBe(false);
      expect(res.status).toBe(409);
    });

    it('requires admin authorization', async () => {
      const req = createUnauthorizedRequest('http://localhost:3000/api/admin/projects', 'POST', { display_name: 'Test', external_project_id: 'ext-1' });
      const res = await ProjectPost(req as any);
      expect(res.status).toBe(401);
    });
  });

  describe('Credential Management', () => {
    const testApiKey = "test-api-key-secret-123";
    const fingerprint = crypto.createHash('sha256').update(testApiKey).digest('hex');

    it('rejects duplicate credentials via fingerprint', async () => {
      vi.mocked(prisma.geminiKey.findFirst).mockResolvedValue({ id: 'k1' } as any);

      const req = createAdminRequest('http://localhost:3000/api/admin/credentials', 'POST', { apiKey: testApiKey, projectId: 'p1' });
      const res = await CredentialPost(req as any);
      const json = await res.json();

      expect(json.success).toBe(false);
      expect(res.status).toBe(409);
      expect(prisma.geminiKey.findFirst).toHaveBeenCalledWith({ where: { key_fingerprint: fingerprint } });
    });

    it('validates provider and encrypts valid credential correctly', async () => {
      vi.mocked(prisma.geminiKey.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.providerProject.findUnique).mockResolvedValue({ id: 'p1' } as any);
      const { validateCredentialWithProvider } = await import('@/lib/services/discovery');
      vi.mocked(validateCredentialWithProvider).mockResolvedValue(true);

      vi.mocked(prisma.geminiKey.create).mockResolvedValue({
        id: 'k2',
        project_id: 'p1',
        status: 'AVAILABLE'
      } as any);

      const req = createAdminRequest('http://localhost:3000/api/admin/credentials', 'POST', { apiKey: testApiKey, projectId: 'p1' });
      const res = await CredentialPost(req as any);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data.id).toBe('k2');
      
      // Ensure plaintext wasn't saved or logged or returned
      expect(JSON.stringify(json)).not.toContain(testApiKey);
      const createCallArgs = vi.mocked(prisma.geminiKey.create).mock.calls[0][0];
      expect(createCallArgs.data.encrypted_api_key).not.toBe(testApiKey);
      expect(createCallArgs.data.encrypted_api_key).toBeDefined();
      expect(createCallArgs.data.last_used_at).toBeNull(); // Initial LRU state
    });

    it('rejects invalid provider credential', async () => {
      vi.mocked(prisma.geminiKey.findFirst).mockResolvedValue(null);
      const { validateCredentialWithProvider } = await import('@/lib/services/discovery');
      vi.mocked(validateCredentialWithProvider).mockResolvedValue(false);

      const req = createAdminRequest('http://localhost:3000/api/admin/credentials', 'POST', { apiKey: testApiKey, projectId: 'p1' });
      const res = await CredentialPost(req as any);
      const json = await res.json();

      expect(json.success).toBe(false);
      expect(res.status).toBe(400);
      expect(prisma.geminiKey.create).not.toHaveBeenCalled();
    });
  });
});
