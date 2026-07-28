import { NextResponse } from "next/server";
import { withSessionAdmin } from "@/lib/middlewares/withAdmin";
import { prisma } from "@/lib/db";
import { logSystemEventInBackground } from "@/lib/services/audit";
import { validateProjectModels } from "@/lib/services/discovery";

async function postHandler(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;

    const project = await prisma.providerProject.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Refresh model availability
    await validateProjectModels(id);

    await logSystemEventInBackground("MODEL_AVAILABILITY_REFRESHED", null, {
      adminAction: true,
      projectId: id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Refresh Models Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withSessionAdmin(postHandler as any);
