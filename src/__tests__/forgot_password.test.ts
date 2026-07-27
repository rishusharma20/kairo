import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as requestHandler } from "@/app/api/auth/forgot-password/request/route";
import { POST as verifyHandler } from "@/app/api/auth/forgot-password/verify/route";
import { POST as resetHandler } from "@/app/api/auth/forgot-password/reset/route";
import { prisma } from "@/lib/db";
import { sendResetOtpEmail } from "@/lib/services/email";
import crypto from "crypto";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("@/lib/services/email", () => ({
  sendResetOtpEmail: vi.fn(async () => {
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
    if (!user || !pass) {
      throw new Error("SMTP Configuration Error: EMAIL_USER and EMAIL_APP_PASSWORD must be configured.");
    }
  }),
}));

describe("Forgot Password Flow & Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_USER = "test@gmail.com";
    process.env.EMAIL_APP_PASSWORD = "testpassword12345";
  });

  describe("SMTP Configuration Validation", () => {
    it("fails safely if production email environment variables are missing", async () => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_APP_PASSWORD;
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_PASS;

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "user-1", email: "user@gmail.com", full_name: "John" } as never);
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(null as never);

      const req = new Request("http://localhost/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com" }),
      });

      const res = await requestHandler(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Internal Server Error");
    });
  });

  describe("Forgot Password Request", () => {
    it("generic success for unknown email (enumeration protection)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);

      const req = new Request("http://localhost/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@gmail.com" }),
      });

      const res = await requestHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("verification code has been sent");
      expect(sendResetOtpEmail).not.toHaveBeenCalled();
    });

    it("sends email and creates log for known email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "user-1", email: "user@gmail.com", full_name: "John" } as never);
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(null as never);

      const req = new Request("http://localhost/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com" }),
      });

      const res = await requestHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(sendResetOtpEmail).toHaveBeenCalledWith("user@gmail.com", "John", expect.any(String));
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("enforces resend cooldown limit (abuse protection)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "user-1", email: "user@gmail.com", full_name: "John" } as never);
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce({
        created_at: new Date(Date.now() - 10 * 1000),
      } as never);

      const req = new Request("http://localhost/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com" }),
      });

      const res = await requestHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("wait 60 seconds");
    });
  });

  describe("OTP Verification", () => {
    it("rejects invalid/wrong OTP and increments attempts (brute-force protection)", async () => {
      const user = { id: "user-1", email: "user@gmail.com" };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);

      const otpHash = crypto.createHash("sha256").update("123456").digest("hex");
      const latestOtpLog = {
        id: "log-1",
        metadata: JSON.stringify({
          email: "user@gmail.com",
          otpHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          used: false,
        }),
      };
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(latestOtpLog as never);

      const req = new Request("http://localhost/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", otp: "999999" }),
      });

      const res = await verifyHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid verification code");
      expect(prisma.auditLog.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({
          metadata: expect.stringContaining('"attempts":1')
        })
      }));
    });

    it("rejects expired OTP", async () => {
      const user = { id: "user-1", email: "user@gmail.com" };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);

      const otpHash = crypto.createHash("sha256").update("123456").digest("hex");
      const latestOtpLog = {
        id: "log-1",
        metadata: JSON.stringify({
          email: "user@gmail.com",
          otpHash,
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          attempts: 0,
          used: false,
        }),
      };
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(latestOtpLog as never);

      const req = new Request("http://localhost/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", otp: "123456" }),
      });

      const res = await verifyHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("expired");
    });

    it("prevents brute-force guessing by invalidating after 5 failed attempts", async () => {
      const user = { id: "user-1", email: "user@gmail.com" };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);

      const otpHash = crypto.createHash("sha256").update("123456").digest("hex");
      const latestOtpLog = {
        id: "log-1",
        metadata: JSON.stringify({
          email: "user@gmail.com",
          otpHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 5,
          used: false,
        }),
      };
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(latestOtpLog as never);

      const req = new Request("http://localhost/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", otp: "123456" }),
      });

      const res = await verifyHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("invalidated");
    });

    it("generates resetToken, marks OTP as used, and logs authorization on success", async () => {
      const user = { id: "user-1", email: "user@gmail.com" };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);

      const otpHash = crypto.createHash("sha256").update("123456").digest("hex");
      const latestOtpLog = {
        id: "log-1",
        metadata: JSON.stringify({
          email: "user@gmail.com",
          otpHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          used: false,
        }),
      };
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(latestOtpLog as never);

      const req = new Request("http://localhost/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", otp: "123456" }),
      });

      const res = await verifyHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.resetToken).toBeDefined();

      expect(prisma.auditLog.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({
          metadata: expect.stringContaining('"used":true')
        })
      }));

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: "PASSWORD_RESET_AUTHORIZED",
        })
      }));
    });
  });

  describe("Password Reset API", () => {
    it("rejects reset request without valid token / authorization", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "user-1", email: "user@gmail.com" } as never);
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(null as never);

      const req = new Request("http://localhost/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", resetToken: "invalid-token", password: "newpassword123" }),
      });

      const res = await resetHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("expired");
    });

    it("resets password, hashes it, and consumes authorization token on valid request", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "user-1", email: "user@gmail.com" } as never);
      
      const latestAuthLog = {
        id: "log-auth-1",
        metadata: JSON.stringify({
          email: "user@gmail.com",
          resetToken: "valid-reset-token-xyz",
          used: false,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      };
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(latestAuthLog as never);

      const req = new Request("http://localhost/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", resetToken: "valid-reset-token-xyz", password: "newpassword123" }),
      });

      const res = await resetHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          password_hash: expect.any(String),
        })
      }));

      expect(prisma.auditLog.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "log-auth-1" },
        data: expect.objectContaining({
          metadata: expect.stringContaining('"used":true')
        })
      }));
    });

    it("rejects token reuse after reset", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "user-1", email: "user@gmail.com" } as never);
      
      const latestAuthLog = {
        id: "log-auth-1",
        metadata: JSON.stringify({
          email: "user@gmail.com",
          resetToken: "valid-reset-token-xyz",
          used: true,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      };
      vi.mocked(prisma.auditLog.findFirst).mockResolvedValueOnce(latestAuthLog as never);

      const req = new Request("http://localhost/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email: "user@gmail.com", resetToken: "valid-reset-token-xyz", password: "newpassword123" }),
      });

      const res = await resetHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already been used");
    });
  });
});
