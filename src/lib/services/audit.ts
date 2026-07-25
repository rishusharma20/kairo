import { prisma } from "@/lib/db";
import { runInBackground } from "@/lib/services/background";

export async function logSystemEvent(
  action: string,
  userId?: string | null,
  metadata?: Record<string, unknown> | null,
  adminId?: string | null
) {
  return await prisma.auditLog.create({
    data: {
      action,
      user_id: userId || null,
      admin_id: adminId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }
  });
}

export function logSystemEventInBackground(
  action: string,
  userId?: string | null,
  metadata?: Record<string, unknown> | null,
  adminId?: string | null
) {
  runInBackground(`logSystemEvent-${action}`, async () => {
    await logSystemEvent(action, userId, metadata, adminId);
  });
}

export function logRequestEventInBackground(
  userId: string,
  requestType: string,
  resultStatus: string
) {
  runInBackground(`logRequestEvent`, async () => {
    await prisma.auditLog.create({
      data: {
        action: "GEMINI_REQUEST",
        user_id: userId,
        metadata: JSON.stringify({
          feature: requestType,
          result: resultStatus,
          timestamp: new Date().toISOString()
        }),
      }
    });
  });
}
