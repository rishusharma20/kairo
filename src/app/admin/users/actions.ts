"use server";

import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "kairo-local-admin-key";

/**
 * Validates that the current caller is an authenticated admin.
 */
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin access required.");
  }
}

/**
 * Constructs the base URL dynamically so fetch calls work in any environment
 * without hardcoding localhost.
 */
async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Proxy: Fetch Users
 */
export async function fetchUsersAction(query: { email?: string; id?: string; status?: string; plan?: string } = {}) {
  await requireAdmin();
  const baseUrl = await getBaseUrl();
  
  const params = new URLSearchParams();
  if (query.email) params.append("email", query.email);
  if (query.id) params.append("id", query.id);
  if (query.status) params.append("status", query.status);
  if (query.plan) params.append("plan", query.plan);
  
  const url = `${baseUrl}/api/admin/users${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-admin-key": ADMIN_API_KEY
    },
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch users");
  return json.data;
}

/**
 * Proxy: Admin Actions (Block, Unblock, Upgrade, Downgrade, Delete)
 */
export async function performAdminAction(userId: string, action: "block" | "unblock" | "upgrade" | "downgrade" | "delete") {
  await requireAdmin();
  const baseUrl = await getBaseUrl();
  
  // Maps the action to the exact frozen endpoints
  const isDelete = action === "delete";
  const endpoint = isDelete 
    ? `${baseUrl}/api/admin/users/${userId}` 
    : `${baseUrl}/api/admin/users/${userId}/${action}`;

  const res = await fetch(endpoint, {
    method: isDelete ? "DELETE" : "POST",
    headers: {
      "x-admin-key": ADMIN_API_KEY
    },
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Failed to ${action} user`);
  
  // Phase 5: Revalidate entire admin layout to ensure Overview and Audit Logs reflect mutations
  revalidatePath('/admin', 'layout');
  
  return json.data;
}
