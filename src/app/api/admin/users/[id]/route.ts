import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { deleteUser } from "@/lib/services/admin";

async function handler(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const user = await deleteUser(id);
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    const status = error.message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export const DELETE = withAdminValidation(handler);
