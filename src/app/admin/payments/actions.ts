"use server";

import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "kairo-local-admin-key";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin access required.");
  }
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Proxy: Fetch Payment Requests
 */
export async function fetchPaymentsAction(statusFilter?: "PENDING" | "APPROVED" | "REJECTED") {
  await requireAdmin();
  const baseUrl = await getBaseUrl();
  
  const url = `${baseUrl}/api/admin/payments${statusFilter ? `?status=${statusFilter}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-admin-key": ADMIN_API_KEY },
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch payments");
  return json.data;
}

/**
 * Proxy: Approve Payment
 */
export async function approvePaymentAction(paymentId: string) {
  await requireAdmin();
  const baseUrl = await getBaseUrl();
  
  const res = await fetch(`${baseUrl}/api/admin/payments/${paymentId}/approve`, {
    method: "POST",
    headers: { "x-admin-key": ADMIN_API_KEY },
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to approve payment");
  
  // Phase 5: Revalidate entire admin layout to ensure Overview and Audit Logs reflect mutations
  revalidatePath('/admin', 'layout');
  
  return json.data;
}

/**
 * Proxy: Reject Payment
 */
export async function rejectPaymentAction(paymentId: string) {
  await requireAdmin();
  const baseUrl = await getBaseUrl();
  
  const res = await fetch(`${baseUrl}/api/admin/payments/${paymentId}/reject`, {
    method: "POST",
    headers: { "x-admin-key": ADMIN_API_KEY },
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to reject payment");
  
  // Phase 5: Revalidate entire admin layout to ensure Overview and Audit Logs reflect mutations
  revalidatePath('/admin', 'layout');
  
  return json.data;
}
