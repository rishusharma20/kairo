import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { prisma } from "@/lib/db";
import { logSystemEventInBackground } from "@/lib/services/audit";

async function patchHandler(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { action } = body;

    if (action !== "ENABLE" && action !== "DISABLE") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const project = await prisma.providerProject.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const status = action === "ENABLE" ? "ACTIVE" : "DISABLED";
    
    const updated = await prisma.providerProject.update({
      where: { id },
      data: { status }
    });

    await logSystemEventInBackground(
      action === "ENABLE" ? "PROVIDER_PROJECT_ENABLED" : "PROVIDER_PROJECT_DISABLED", 
      null, 
      { adminAction: true, projectId: id }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update Project Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PATCH = withAdminValidation(patchHandler as any);
