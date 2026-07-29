import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "kairo-local-admin-key";

/**
 * Middleware for Admin routes.
 * Requires `Authorization: Bearer <ADMIN_API_KEY>` or `x-admin-key: <ADMIN_API_KEY>`.
 */
export function withAdminValidation<T extends unknown[]>(handler: (request: Request, ...args: T) => Promise<Response>) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const authHeader = request.headers.get("Authorization");
    const xAdminKey = request.headers.get("x-admin-key");
    
    let token = xAdminKey;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }

    if (!token || token !== ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing Admin API Key" }, { status: 401 });
    }

    return await handler(request, ...args);
  };
}

/**
 * Middleware for Browser Admin routes.
 * Authenticates using the normal user session cookie and verifies admin email.
 */
export function withSessionAdmin<T extends unknown[]>(handler: (request: Request, ...args: T) => Promise<Response>) {
  return async (request: Request, ...args: T): Promise<Response> => {
    try {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
      }

      const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
      if (session.email !== adminEmail) {
        return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
      }
      
      // Exception: the verification route itself does not need 2FA to be accessed
      const url = new URL(request.url);
      if (url.pathname !== '/api/admin/verify' && !session.adminSecondFactorVerified) {
        return NextResponse.json({ error: "Forbidden: Admin second-factor verification required." }, { status: 403 });
      }

      return await handler(request, ...args);
    } catch (err) {
      console.error("Session Admin Error:", err);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
