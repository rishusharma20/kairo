import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { prisma } from "@/lib/db";
import { logSystemEventInBackground } from "@/lib/services/audit";

async function handler(request: Request) {
  try {
    const body = await request.json();
    const { display_name, external_project_id, provider } = body;

    if (!display_name || !external_project_id) {
      return NextResponse.json(
        { success: false, error: "display_name and external_project_id are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.providerProject.findFirst({
      where: { external_project_id }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A project with this external ID already exists" },
        { status: 409 }
      );
    }

    const project = await prisma.providerProject.create({
      data: {
        display_name,
        external_project_id,
        provider: provider || "GOOGLE_GEMINI",
        status: "ACTIVE"
      }
    });

    await logSystemEventInBackground("PROVIDER_PROJECT_CREATED", null, {
      adminAction: true,
      projectId: project.id
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    console.error("Create Project Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAdminValidation(handler);
