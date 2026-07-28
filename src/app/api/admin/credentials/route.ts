import { NextResponse } from "next/server";
import { withSessionAdmin } from "@/lib/middlewares/withAdmin";
import { prisma } from "@/lib/db";
import { logSystemEventInBackground } from "@/lib/services/audit";
import { encryptKey } from "@/lib/services/encryption";
import { validateCredentialWithProvider, validateProjectModels } from "@/lib/services/discovery";
import crypto from "crypto";

async function handler(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        { success: false, error: "apiKey and projectId are required" },
        { status: 400 }
      );
    }

    // Fingerprint for duplicate detection
    const fingerprint = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Check for duplicates
    const existing = await prisma.geminiKey.findFirst({
      where: { key_fingerprint: fingerprint }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This credential has already been added." },
        { status: 409 }
      );
    }

    // Validate provider structurally
    const isValid = await validateCredentialWithProvider(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credential" },
        { status: 400 }
      );
    }

    // Check project exists
    const project = await prisma.providerProject.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Encrypt
    const encryptedKey = encryptKey(apiKey);

    // Create credential
    const credential = await prisma.geminiKey.create({
      data: {
        encrypted_api_key: encryptedKey,
        key_fingerprint: fingerprint,
        project_id: projectId,
        status: "AVAILABLE",
        priority: 0,
        last_used_at: null // LRU preference for unused
      }
    });

    await logSystemEventInBackground("CREDENTIAL_ADDED", null, {
      adminAction: true,
      projectId,
      credentialId: credential.id
    });

    // Run discovery for this project now that we added a valid key
    await validateProjectModels(projectId);

    return NextResponse.json({ 
      success: true, 
      data: {
        id: credential.id,
        project_id: credential.project_id,
        status: credential.status
      }
    });
  } catch (error: any) {
    console.error("Add Credential Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withSessionAdmin(handler);
