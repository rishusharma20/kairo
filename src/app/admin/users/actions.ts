"use server";

import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { searchUsers, blockUser, unblockUser, deleteUser, changeUserTierAdmin } from "@/lib/services/admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";

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
 * Fetch Users (direct service call)
 */
export async function fetchUsersAction(query: { email?: string; id?: string; status?: string; plan?: string } = {}) {
  await requireAdmin();
  
  // Call the database service directly instead of fetching from our own API
  const users = await searchUsers(query);
  
  // Serialize dates to prevent Next.js Server Actions serialization errors
  return users.map(user => ({
    ...user,
    created_at: user.created_at.toISOString(),
    plan_expires_at: user.plan_expires_at ? user.plan_expires_at.toISOString() : null,
  }));
}

/**
 * Admin Actions (direct service calls)
 */
export async function performAdminAction(
  userId: string, 
  action: "block" | "unblock" | "change_tier" | "delete",
  options?: { targetPlan?: string }
) {
  await requireAdmin();
  
  let result;
  switch (action) {
    case "block": 
      result = await blockUser(userId); 
      break;
    case "unblock": 
      result = await unblockUser(userId); 
      break;
    case "change_tier": 
      if (!options?.targetPlan) throw new Error("targetPlan is required for change_tier");
      result = await changeUserTierAdmin(userId, options.targetPlan); 
      break;
    case "delete": 
      result = await deleteUser(userId); 
      break;
    default: 
      throw new Error("Invalid action");
  }
  
  revalidatePath('/admin', 'layout');
  
  return {
    ...result,
    created_at: result.created_at.toISOString(),
    updated_at: result.updated_at.toISOString(),
    plan_expires_at: result.plan_expires_at ? result.plan_expires_at.toISOString() : null,
  };
}
