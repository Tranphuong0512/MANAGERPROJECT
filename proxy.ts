import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js 16 Proxy — Bảo vệ route xác thực + Refresh session
 * 
 * 1. Refresh Supabase Auth session token trên mọi request
 * 2. Redirect về /login nếu chưa đăng nhập khi truy cập /dashboard/*
 * 3. Redirect về /dashboard nếu đã đăng nhập khi truy cập /login
 */
export async function proxy(request: NextRequest) {
  // 1. Refresh session và cập nhật cookies
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Bỏ qua các static resources và API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') // static files (favicon, images, etc.)
  ) {
    return response
  }

  // 2. Kiểm tra auth session từ cookies
  const supabaseAuthToken = request.cookies.getAll().find(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  )

  const hasSession = !!supabaseAuthToken?.value

  // 3. Bảo vệ route dashboard — redirect về login nếu chưa xác thực
  if (pathname.startsWith('/dashboard') && !hasSession) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Redirect về dashboard nếu đã đăng nhập mà truy cập login
  if (pathname === '/login' && hasSession) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả các đường dẫn request ngoại trừ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Các tệp tĩnh hình ảnh/media
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
