"use server";

import { getSession } from "@/lib/auth";
import { headers } from "next/headers";

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
 * Proxy: Fetch Audit Logs
 */
export async function fetchAuditLogsAction(limit = 100, offset = 0) {
  await requireAdmin();
  const baseUrl = await getBaseUrl();
  
  const url = `${baseUrl}/api/admin/audit?limit=${limit}&offset=${offset}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-admin-key": ADMIN_API_KEY },
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch audit logs");
  return json.data;
}
