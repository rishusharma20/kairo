import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  
  const headers = new Headers();
  if (isExtension) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers });
    }

    const { searchParams } = new URL(request.url);
    const fetchQuota = searchParams.get('quota') === 'true';

    let requests_used = null;
    let daily_limit = null;

    if (fetchQuota) {
      try {
        const { getUsageQuota } = await import("@/lib/services/usage");
        const quota = await getUsageQuota(session.userId);
        requests_used = quota.requests_used;
        daily_limit = quota.daily_limit;
      } catch (err) {
        console.error("Failed to fetch quota:", err);
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        plan: session.plan,
        status: session.status,
        requests_used,
        daily_limit
      }
    }, { headers });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers });
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  
  const headers = new Headers();
  if (isExtension) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return new NextResponse(null, { status: 204, headers });
}
