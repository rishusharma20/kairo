import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { changeUserTierAdmin } from "@/lib/services/admin";

async function handler(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await changeUserTierAdmin(id, "FREE");
    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    const status = (error as Error).message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export const POST = withAdminValidation(handler);
