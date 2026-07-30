import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/projects/[id]/refresh/route';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import * as discoveryService from '@/lib/services/discovery';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    providerProject: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/audit', () => ({
  logSystemEventInBackground: vi.fn(),
}));

vi.mock('@/lib/services/discovery', () => ({
  validateProjectModels: vi.fn(),
}));

describe('Refresh Models API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ 
      email: process.env.ADMIN_EMAIL || "admin@gmail.com",
      adminSecondFactorVerified: true
    } as any);
  });

  const createRequest = () => {
    return new NextRequest('http://localhost:3000/api/admin/projects/proj-1/refresh', {
      method: 'POST'
    });
  };

  it('REFRESH_A: Valid project ID reaches discovery service', async () => {
    vi.mocked(prisma.providerProject.findUnique).mockResolvedValue({ id: 'proj-1' } as any);
    
    // Simulate Next.js 15+ promise-based params
    const paramsPromise = Promise.resolve({ id: 'proj-1' });
    
    const res = await POST(createRequest() as any, { params: paramsPromise } as any);
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(discoveryService.validateProjectModels).toHaveBeenCalledWith('proj-1');
  });

  it('REFRESH_B: Correct project ID is forwarded from API to service', async () => {
    vi.mocked(prisma.providerProject.findUnique).mockResolvedValue({ id: 'proj-2' } as any);
    
    const paramsPromise = Promise.resolve({ id: 'proj-2' });
    
    const res = await POST(createRequest() as any, { params: paramsPromise } as any);
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(discoveryService.validateProjectModels).toHaveBeenCalledWith('proj-2');
  });

  it('REFRESH_C: Missing projectId returns 400', async () => {
    const paramsPromise = Promise.resolve({ id: '' });
    
    const res = await POST(createRequest() as any, { params: paramsPromise } as any);
    const json = await res.json();
    
    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid project ID');
    expect(discoveryService.validateProjectModels).not.toHaveBeenCalled();
  });

  it('REFRESH_D: Undefined projectId never reaches Prisma', async () => {
    // Cast to any to simulate undefined being passed accidentally
    const paramsPromise = Promise.resolve({ id: undefined } as any);
    
    const res = await POST(createRequest() as any, { params: paramsPromise } as any);
    const json = await res.json();
    
    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid project ID');
    expect(prisma.providerProject.findUnique).not.toHaveBeenCalled();
  });

  it('REFRESH_E: Unknown project returns 404', async () => {
    vi.mocked(prisma.providerProject.findUnique).mockResolvedValue(null);
    
    const paramsPromise = Promise.resolve({ id: 'proj-unknown' });
    
    const res = await POST(createRequest() as any, { params: paramsPromise } as any);
    const json = await res.json();
    
    expect(res.status).toBe(404);
    expect(json.error).toBe('Project not found');
    expect(discoveryService.validateProjectModels).not.toHaveBeenCalled();
  });

  it('REFRESH_J: Discovery/provider failure returns sanitized response', async () => {
    vi.mocked(prisma.providerProject.findUnique).mockResolvedValue({ id: 'proj-1' } as any);
    vi.mocked(discoveryService.validateProjectModels).mockRejectedValue(new Error('Provider timeout'));
    
    const paramsPromise = Promise.resolve({ id: 'proj-1' });
    
    const res = await POST(createRequest() as any, { params: paramsPromise } as any);
    const json = await res.json();
    
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Provider timeout');
  });
});
