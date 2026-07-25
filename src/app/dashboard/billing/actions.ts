"use server";

import { submitPaymentRequest, hasPendingPaymentRequest } from "@/lib/services/payment";
import { getSession } from "@/lib/auth";

export async function submitPaymentAction(utr: string, targetPlan: string) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  await submitPaymentRequest(session.userId, utr, targetPlan);
  return { success: true };
}

export async function checkPendingPaymentAction() {
  const session = await getSession();
  if (!session) return false;

  return await hasPendingPaymentRequest(session.userId);
}
