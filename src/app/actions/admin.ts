"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleUserSuspension(userId: string, isSuspended: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: !isSuspended }
  });

  revalidatePath("/admin/users");
}
