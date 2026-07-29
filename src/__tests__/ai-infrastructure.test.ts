import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/ai-infrastructure/route';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    providerProject: {
      findMany: vi.fn(),
    },
    geminiKey: {
      findMany: vi.fn(),
    },
    projectModelAvailability: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

// We need to mock MODEL_REGISTRY to ensure tests match the route's behavior
vi.mock('@/lib/services/models', () => ({
  MODEL_REGISTRY: [
    { id: 'gemini-3.6-flash' },
    { id: 'gemini-3.5-flash' },
    { id: 'gemini-3.5-flash-lite' },
    { id: 'gemma-4-31b-it' },
    { id: 'gemma-4-26b-a4b-it' },
  ]
}));

describe('AI Infrastructure Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createAdminRequest = () => {
    vi.mocked(getSession).mockResolvedValue({ 
      email: process.env.ADMIN_EMAIL || "admin@gmail.com",
      adminSecondFactorVerified: true
    } as any);
    return new NextRequest('http://localhost:3000/api/admin/ai-infrastructure');
  };

  const createUnauthorizedRequest = () => {
    vi.mocked(getSession).mockResolvedValue(null);
    return new NextRequest('http://localhost:3000/api/admin/ai-infrastructure');
  };

  it('rejects unauthenticated requests (401)', async () => {
    const res = await GET(createUnauthorizedRequest() as any);
    expect(res.status).toBe(401);
  });

  it('calculates HEALTHY state correctly', async () => {
    vi.mocked(prisma.providerProject.findMany).mockResolvedValue([
      { id: 'p1', status: 'ACTIVE' }
    ] as any);
    
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValue([
      { id: 'k1', status: 'AVAILABLE', project_id: 'p1', cooldown_until: null }
    ] as any);

    vi.mocked(prisma.projectModelAvailability.findMany).mockResolvedValue([
      { project_id: 'p1', model_id: 'gemini-3.6-flash', status: 'AVAILABLE' }
    ] as any);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);

    const res = await GET(createAdminRequest() as any);
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(json.data.health).toBe('HEALTHY');
    expect(json.data.routes).toBe(1);
    
    // Check security: api key fields are not exposed
    expect(json.data.credentials[0]).not.toHaveProperty('encrypted_api_key');
    expect(json.data.credentials[0]).not.toHaveProperty('iv');
  });

  it('calculates DEGRADED state when credentials are cooling down', async () => {
    vi.mocked(prisma.providerProject.findMany).mockResolvedValue([
      { id: 'p1', status: 'ACTIVE' }
    ] as any);
    
    // k1 is healthy, k2 is in cooldown -> so we still have routes, but DEGRADED
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValue([
      { id: 'k1', status: 'AVAILABLE', project_id: 'p1', cooldown_until: null },
      { id: 'k2', status: 'COOLDOWN', project_id: 'p1', cooldown_until: new Date(Date.now() + 100000) }
    ] as any);

    vi.mocked(prisma.projectModelAvailability.findMany).mockResolvedValue([
      { project_id: 'p1', model_id: 'gemini-3.6-flash', status: 'AVAILABLE' }
    ] as any);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);

    const res = await GET(createAdminRequest() as any);
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(json.data.health).toBe('DEGRADED');
    expect(json.data.warnings).toContain('1 CREDENTIALS IN COOLDOWN');
  });

  it('calculates UNAVAILABLE state when no routes exist', async () => {
    vi.mocked(prisma.providerProject.findMany).mockResolvedValue([
      { id: 'p1', status: 'ACTIVE' }
    ] as any);
    
    // k1 is available, but the model is UNAVAILABLE -> 0 routes
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValue([
      { id: 'k1', status: 'AVAILABLE', project_id: 'p1', cooldown_until: null }
    ] as any);

    vi.mocked(prisma.projectModelAvailability.findMany).mockResolvedValue([
      { project_id: 'p1', model_id: 'gemini-3.6-flash', status: 'UNAVAILABLE' }
    ] as any);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);

    const res = await GET(createAdminRequest() as any);
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(json.data.health).toBe('UNAVAILABLE');
    expect(json.data.routes).toBe(0);
    expect(json.data.warnings).toContain('NO AVAILABLE AI ROUTES');
  });

  it('correctly aggregates recent routing activity and failures', async () => {
    vi.mocked(prisma.providerProject.findMany).mockResolvedValue([]);
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValue([]);
    vi.mocked(prisma.projectModelAvailability.findMany).mockResolvedValue([]);
    
    // Simulate a request with a failover then success
    const telemetry = [
      {
        requestId: 'req-1',
        projectId: 'p1',
        credentialId: 'k1',
        modelId: 'gemini-3.6-flash',
        attemptNumber: 1,
        latencyMs: 500,
        result: 'FAILURE',
        failureCategory: 'RATE_LIMIT'
      },
      {
        requestId: 'req-1',
        projectId: 'p2',
        credentialId: 'k2',
        modelId: 'gemini-3.5-flash',
        attemptNumber: 2,
        latencyMs: 800,
        result: 'SUCCESS'
      }
    ];

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'log1',
        action: 'ROUTER_TELEMETRY',
        metadata: JSON.stringify({ telemetry }),
        created_at: new Date()
      }
    ] as any);

    const res = await GET(createAdminRequest() as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    const metrics = json.data.metrics;
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(1);
    expect(metrics.failedRequests).toBe(0);
    expect(metrics.providerAttempts).toBe(2);
    expect(metrics.failovers).toBe(1);
    expect(metrics.averageLatency).toBe(650); // (500 + 800) / 2
    expect(metrics.failureCategories['RATE_LIMIT']).toBe(1);
    expect(json.data.recentActivity).toHaveLength(2);
  });

  it('handles empty pool gracefully', async () => {
    vi.mocked(prisma.providerProject.findMany).mockResolvedValue([]);
    vi.mocked(prisma.geminiKey.findMany).mockResolvedValue([]);
    vi.mocked(prisma.projectModelAvailability.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const res = await GET(createAdminRequest() as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.health).toBe('UNAVAILABLE');
    expect(json.data.projects).toHaveLength(0);
    expect(json.data.credentials).toHaveLength(0);
    expect(json.data.warnings).toContain('NO AVAILABLE AI ROUTES');
  });
});
