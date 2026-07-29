import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'

const protectedRoutes = ['/dashboard', '/admin']
const authRoutes = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if it's a protected route or auth route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
  }

  // Get session token
  const token = request.cookies.get('kairo_session')?.value
  
  // Verify token
  const session = await verifySession(token)

  // Redirect to login if trying to access protected route without valid session
  if (isProtectedRoute && !session) {
    const url = new URL('/auth/login', request.url)
    return NextResponse.redirect(url)
  }

  // Enforce V2 status requirements for protected routes
  if (isProtectedRoute && session && (session.status === 'BLOCKED' || session.status === 'DELETED')) {
    const url = new URL('/auth/login', request.url)
    // Optionally we can append a query param like ?error=blocked to inform the user
    return NextResponse.redirect(url)
  }

  // Admin Route Protection: Only allow admin email
  if (pathname.startsWith('/admin')) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    if (session?.email !== adminEmail) {
      const url = new URL('/dashboard', request.url)
      return NextResponse.redirect(url)
    }

    // 2FA Admin Verification
    const isVerifyRoute = pathname === '/admin/verify';
    if (!session.adminSecondFactorVerified && !isVerifyRoute) {
      const url = new URL('/admin/verify', request.url)
      return NextResponse.redirect(url)
    }
    
    if (session.adminSecondFactorVerified && isVerifyRoute) {
      const url = new URL('/admin', request.url)
      return NextResponse.redirect(url)
    }
  }

  // Redirect to dashboard if trying to access auth routes with valid session
  if (isAuthRoute && session) {
    const url = new URL('/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ]
}
