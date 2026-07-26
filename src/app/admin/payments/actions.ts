"use server";

import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getPaymentRequests, approvePayment, rejectPayment } from "@/lib/services/payment";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin access required.");
  }
  return { ...session, apiKey: ADMIN_API_KEY as string };
}

/**
 * Fetch Payment Requests (direct service call)
 */
export async function fetchPaymentsAction(statusFilter?: "PENDING" | "APPROVED" | "REJECTED") {
  await requireAdmin();
  const payments = await getPaymentRequests(statusFilter);
  return payments;
}

/**
 * Approve Payment (direct service call)
 */
export async function approvePaymentAction(paymentId: string) {
  const session = await requireAdmin();
  
  const result = await approvePayment(paymentId, session.userId);
  
  // Revalidate entire admin layout to ensure Overview and Audit Logs reflect mutations
  revalidatePath('/admin', 'layout');
  
  return result;
}

/**
 * Reject Payment (direct service call)
 */
export async function rejectPaymentAction(paymentId: string) {
  const session = await requireAdmin();
  
  const result = await rejectPayment(paymentId, session.userId);
  
  // Revalidate entire admin layout to ensure Overview and Audit Logs reflect mutations
  revalidatePath('/admin', 'layout');
  
  return result;
}
