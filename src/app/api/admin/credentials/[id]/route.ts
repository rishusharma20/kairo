import { NextResponse } from "next/server";
import { withSessionAdmin } from "@/lib/middlewares/withAdmin";
import { prisma } from "@/lib/db";
import { logSystemEventInBackground } from "@/lib/services/audit";
import { validateCredentialWithProvider } from "@/lib/services/discovery";
import { decryptKey } from "@/lib/services/encryption";

async function patchHandler(request: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = params?.id;

    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ success: false, error: "INVALID_CREDENTIAL_ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    if (!["ENABLE", "DISABLE", "REMOVE"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const credential = await prisma.geminiKey.findUnique({
      where: { id }
    });

    if (!credential) {
      return NextResponse.json({ success: false, error: "CREDENTIAL_NOT_FOUND" }, { status: 404 });
    }

    if (action === "ENABLE") {
      // Re-validate before enabling
      const apiKey = decryptKey(credential.encrypted_api_key);
      const isValid = await validateCredentialWithProvider(apiKey);
      if (!isValid) {
        return NextResponse.json({ success: false, error: "Cannot enable: Credential is invalid with provider" }, { status: 400 });
      }
      
      await prisma.geminiKey.update({
        where: { id },
        data: { status: "AVAILABLE" }
      });
      
      await logSystemEventInBackground("CREDENTIAL_ENABLED", null, { adminAction: true, credentialId: id });
    } else {
      // Both DISABLE and REMOVE will just set to DISABLED (soft delete)
      await prisma.geminiKey.update({
        where: { id },
        data: { status: "DISABLED" }
      });
      
      await logSystemEventInBackground(
        action === "REMOVE" ? "CREDENTIAL_REMOVED" : "CREDENTIAL_DISABLED", 
        null, 
        { adminAction: true, credentialId: id }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Update Credential Error:", error);
    return NextResponse.json({ success: false, error: "CREDENTIAL_UPDATE_FAILED" }, { status: 500 });
  }
}

export const PATCH = withSessionAdmin(patchHandler as any);
