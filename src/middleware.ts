import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'

const protectedRoutes = ['/dashboard', '/admin']
const authRoutes = ['/auth/login', '/auth/verify']

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

  // Admin Route Protection: Only allow admin email
  if (pathname.startsWith('/admin')) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    if (session?.email !== adminEmail) {
      const url = new URL('/dashboard', request.url)
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
