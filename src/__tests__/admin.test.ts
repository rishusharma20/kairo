import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { blockUser, unblockUser, deleteUser } from '@/lib/services/admin';
import { assignKeys, releaseKeys } from '@/lib/services/keys';
import { logSystemEventInBackground } from '@/lib/services/audit';
import { withAdminValidation } from '@/lib/middlewares/withAdmin';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
}));

vi.mock('@/lib/services/keys', () => ({
  releaseKeys: vi.fn(),
  assignKeys: vi.fn(),
}));

vi.mock('@/lib/services/plan', () => ({
  changeUserTier: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  logSystemEventInBackground: vi.fn(),
}));

describe('Admin User Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('blockUser', () => {
    it('throws if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      await expect(blockUser('123')).rejects.toThrow("User not found");
    });

    it('throws if user already blocked', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'BLOCKED' } as never);
      await expect(blockUser('123')).rejects.toThrow("User is already blocked");
    });

    it('blocks user successfully and releases keys', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE' } as never);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ status: 'BLOCKED' } as never);

      await blockUser('123');

      expect(releaseKeys).toHaveBeenCalledWith('123', 9999, 'USER_BLOCKED');
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: '123' }, data: { status: 'BLOCKED' } });
      expect(logSystemEventInBackground).toHaveBeenCalledWith('USER_BLOCKED', '123', { adminAction: true });
    });
  });

  describe('unblockUser', () => {
    it('throws if user not blocked', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE' } as never);
      await expect(unblockUser('123')).rejects.toThrow("User is not blocked");
    });

    it('unblocks and assigns 3 keys if PREMIUM', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'BLOCKED', plan: 'PREMIUM' } as never);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ status: 'ACTIVE' } as never);

      await unblockUser('123');

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: '123' }, data: { status: 'ACTIVE' } });
      expect(assignKeys).toHaveBeenCalledWith('123', 3, 'ADMIN_RELEASE');
      expect(logSystemEventInBackground).toHaveBeenCalledWith('USER_UNBLOCKED', '123', { adminAction: true, keysAssigned: 3 });
    });
    
    it('unblocks and assigns 1 key if FREE', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'BLOCKED', plan: 'FREE' } as never);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ status: 'ACTIVE' } as never);

      await unblockUser('123');

      expect(assignKeys).toHaveBeenCalledWith('123', 1, 'ADMIN_RELEASE');
    });
  });

  describe('deleteUser', () => {
    it('throws if user already deleted', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'DELETED' } as never);
      await expect(deleteUser('123')).rejects.toThrow("User is already deleted");
    });

    it('deletes user successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ status: 'ACTIVE' } as never);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ status: 'DELETED' } as never);

      await deleteUser('123');

      expect(releaseKeys).toHaveBeenCalledWith('123', 9999, 'USER_DELETED');
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: '123' }, data: { status: 'DELETED' } });
      expect(logSystemEventInBackground).toHaveBeenCalledWith('USER_DELETED', '123', { adminAction: true });
    });
  });
});

describe('Admin Middleware', () => {
  it('blocks request if missing admin key', async () => {
    const handler = vi.fn();
    const middleware = withAdminValidation(handler);
    
    const req = new NextRequest('http://localhost', {
      headers: { 'Authorization': 'Bearer wrong-key' }
    });
    
    const res = await middleware(req as never);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows request with correct admin key', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200 });
    const middleware = withAdminValidation(handler);
    
    // The middleware defaults to 'kairo-local-admin-key' if not defined
    const req = new NextRequest('http://localhost', {
      headers: { 'x-admin-key': process.env.ADMIN_API_KEY || 'kairo-local-admin-key' }
    });
    
    await middleware(req as never);
    expect(handler).toHaveBeenCalled();
  });
});
