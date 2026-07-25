import { prisma } from "@/lib/db";
import { upgradeToPremium } from "@/lib/services/plan";
import { logSystemEvent } from "@/lib/services/audit";

export async function getPaymentRequests(statusFilter?: "PENDING" | "APPROVED" | "REJECTED") {
  const logs = await prisma.auditLog.findMany({
    where: { action: "PAYMENT_REQUEST" },
    include: { user: true },
    orderBy: { created_at: "desc" },
  });

  const parsed = logs.map(log => {
    let metadata: Record<string, unknown> = {};
    try { metadata = log.metadata ? JSON.parse(log.metadata) : {}; } catch (e) {
      console.error(e);
    }

    return {
      id: log.id,
      user_id: log.user_id,
      utr: metadata.utr || "N/A",
      status: metadata.status || "PENDING",
      submitted_at: log.created_at.toISOString(),
      user: log.user ? {
        full_name: log.user.full_name,
        email: log.user.email,
        plan: log.user.plan,
      } : null,
    };
  });

  if (statusFilter) {
    return parsed.filter(req => req.status === statusFilter);
  }
  
  return parsed;
}

export async function approvePayment(paymentRequestId: string, adminId: string) {
  // 1. Fetch Request
  const log = await prisma.auditLog.findUnique({ where: { id: paymentRequestId } });
  if (!log) throw new Error("Payment request not found");
  if (log.action !== "PAYMENT_REQUEST") throw new Error("Invalid request type");
  if (!log.user_id) throw new Error("User associated with this request was not found");
  
  let metadata: Record<string, unknown> = {};
  try { metadata = log.metadata ? JSON.parse(log.metadata) : {}; } catch (e) {
    console.error(e);
  }
  if (metadata.status !== "PENDING") throw new Error("Payment request is already processed");

  // 2. Perform existing Upgrade Logic
  await upgradeToPremium(log.user_id);

  // 3. Mark as Approved
  metadata.status = "APPROVED";
  metadata.approved_at = new Date().toISOString();
  metadata.approved_by = adminId;
  
  await prisma.auditLog.update({
    where: { id: paymentRequestId },
    data: { metadata: JSON.stringify(metadata) }
  });

  // 4. Create Audit Log for the decision
  await logSystemEvent("PAYMENT_APPROVED", log.user_id, { paymentRequestId, utr: metadata.utr }, adminId);

  return { success: true };
}

export async function rejectPayment(paymentRequestId: string, adminId: string) {
  const log = await prisma.auditLog.findUnique({ where: { id: paymentRequestId } });
  if (!log) throw new Error("Payment request not found");
  if (log.action !== "PAYMENT_REQUEST") throw new Error("Invalid request type");
  
  let metadata: Record<string, unknown> = {};
  try { metadata = log.metadata ? JSON.parse(log.metadata) : {}; } catch (e) {
    console.error(e);
  }
  if (metadata.status !== "PENDING") throw new Error("Payment request is already processed");

  // Mark as Rejected (no upgrade)
  metadata.status = "REJECTED";
  metadata.rejected_at = new Date().toISOString();
  metadata.rejected_by = adminId;
  
  await prisma.auditLog.update({
    where: { id: paymentRequestId },
    data: { metadata: JSON.stringify(metadata) }
  });

  await logSystemEvent("PAYMENT_REJECTED", log.user_id, { paymentRequestId, utr: metadata.utr }, adminId);

  return { success: true };
}
