import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get user and check approval status
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('approval_status, is_super_admin')
          .eq('id', user.id)
          .single()

        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        const origin = isLocalEnv
          ? requestUrl.origin
          : forwardedHost
            ? `https://${forwardedHost}`
            : requestUrl.origin

        // Super Admin or approved users go straight to dashboard
        if (profile?.is_super_admin || profile?.approval_status === 'approved') {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (profile?.approval_status === 'rejected') {
          return NextResponse.redirect(`${origin}/access-denied`)
        } else {
          // pending or no profile yet
          return NextResponse.redirect(`${origin}/pending-approval`)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
      }
    }
  }

  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('error', 'Xác thực thất bại. Vui lòng thử lại.')
  return NextResponse.redirect(redirectUrl)
}
