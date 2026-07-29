import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import * as auth from '@/lib/auth';
import { POST as verifyHandler } from '@/app/api/admin/verify/route';

vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  createSession: vi.fn(),
}));

describe('Admin 2FA Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ADMIN_EMAIL: 'admin@gmail.com', ADMIN_ACCESS_CODE: '630720' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Middleware Protections', () => {
    it('A. normal user login does not trigger admin verification', async () => {
      vi.mocked(auth.verifySession).mockResolvedValue({ email: 'user@gmail.com', status: 'ACTIVE' } as any);
      
      const req = new NextRequest('http://localhost:3000/dashboard');
      req.cookies.set('kairo_session', 'token');
      
      const res = await middleware(req);
      expect(res.status).not.toBe(307); // No redirect
    });

    it('B, C. admin accessing /admin/users without 2FA redirects to /admin', async () => {
      vi.mocked(auth.verifySession).mockResolvedValue({ 
        email: 'admin@gmail.com', 
        status: 'ACTIVE',
        adminSecondFactorVerified: undefined
      } as any);
      
      const req = new NextRequest('http://localhost:3000/admin/users');
      req.cookies.set('kairo_session', 'token');
      
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('Location')).toBe('http://localhost:3000/admin');
    });

    it('B, C. admin accessing /admin without 2FA DOES NOT redirect (allows modal render)', async () => {
      vi.mocked(auth.verifySession).mockResolvedValue({ 
        email: 'admin@gmail.com', 
        status: 'ACTIVE',
        adminSecondFactorVerified: undefined
      } as any);
      
      const req = new NextRequest('http://localhost:3000/admin');
      req.cookies.set('kairo_session', 'token');
      
      const res = await middleware(req);
      expect(res.status).not.toBe(307);
    });

    it('J. verified admin can access /admin', async () => {
      vi.mocked(auth.verifySession).mockResolvedValue({ 
        email: 'admin@gmail.com', 
        status: 'ACTIVE',
        adminSecondFactorVerified: true
      } as any);
      
      const req = new NextRequest('http://localhost:3000/admin');
      req.cookies.set('kairo_session', 'token');
      
      const res = await middleware(req);
      expect(res.status).not.toBe(307);
    });

    it('prevents redirect loops by redirecting /admin/verify to /admin', async () => {
      vi.mocked(auth.verifySession).mockResolvedValue({ 
        email: 'admin@gmail.com', 
        status: 'ACTIVE',
        adminSecondFactorVerified: undefined
      } as any);
      
      const req = new NextRequest('http://localhost:3000/admin/verify');
      req.cookies.set('kairo_session', 'token');
      
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('Location')).toBe('http://localhost:3000/admin');
    });
  });

  describe('API Protections & Verification Route', () => {
    const createReq = (body: any) => new Request('http://localhost:3000/api/admin/verify', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    it('D. correct 6-digit code verifies the session', async () => {
      vi.mocked(auth.getSession).mockResolvedValue({ userId: 'u1', email: 'admin@gmail.com' } as any);
      
      const req = createReq({ code: '630720' });
      const res = await verifyHandler(req);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(auth.updateSession).toHaveBeenCalledWith({ adminSecondFactorVerified: true });
    });

    it('E. incorrect code rejected', async () => {
      vi.mocked(auth.getSession).mockResolvedValue({ userId: 'u2', email: 'admin@gmail.com' } as any);
      
      const req = createReq({ code: '999999' });
      const res = await verifyHandler(req);
      const data = await res.json();
      
      expect(res.status).toBe(403);
      expect(data.error).toBe('INVALID_ADMIN_CODE');
      expect(auth.updateSession).not.toHaveBeenCalled();
    });

    it('F. malformed code rejected', async () => {
      vi.mocked(auth.getSession).mockResolvedValue({ userId: 'u3', email: 'admin@gmail.com' } as any);
      
      // Too short
      let req = createReq({ code: '123' });
      let res = await verifyHandler(req);
      expect(res.status).toBe(400);

      // Contains letters
      req = createReq({ code: '63072a' });
      res = await verifyHandler(req);
      expect(res.status).toBe(400);
    });

    it('G. unauthenticated user cannot call verification endpoint', async () => {
      vi.mocked(auth.getSession).mockResolvedValue(null);
      
      const req = createReq({ code: '630720' });
      const res = await verifyHandler(req);
      expect(res.status).toBe(401);
    });

    it('H. non-admin cannot call verification endpoint', async () => {
      vi.mocked(auth.getSession).mockResolvedValue({ userId: 'u4', email: 'user@gmail.com' } as any);
      
      const req = createReq({ code: '630720' });
      const res = await verifyHandler(req);
      expect(res.status).toBe(403);
    });

    it('O. brute-force/rate-limit behavior works', async () => {
      vi.mocked(auth.getSession).mockResolvedValue({ userId: 'rate-limit-user', email: 'admin@gmail.com' } as any);
      
      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const req = createReq({ code: '111111' });
        const res = await verifyHandler(req);
        expect(res.status).toBe(403);
      }

      // 6th attempt should be 429
      const req = createReq({ code: '111111' });
      const res = await verifyHandler(req);
      expect(res.status).toBe(429);
      
      const data = await res.json();
      expect(data.error).toBe('TOO_MANY_ATTEMPTS');
    });
  });
});
