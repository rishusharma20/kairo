import { NextResponse } from "next/server";

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
