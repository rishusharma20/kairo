import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// In production, this should be in an environment variable (e.g. process.env.JWT_SECRET)
const JWT_SECRET = new TextEncoder().encode(
  "kairo-intelligence-super-secret-key-that-must-be-very-long"
);

const SESSION_COOKIE_NAME = "kairo_session";

export interface SessionPayload {
  userId: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return await verifySession(token);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Extension Utility: Verifies the session from an API request header or cookie
export async function verifyExtensionRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value || req.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return null;
  }

  return await verifySession(token);
}
