import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const proto = request.headers.get('x-forwarded-proto')
      const host = forwardedHost || request.headers.get('host') || ''
      const protocol = proto || 'http'
      const redirectUrl = `${protocol}://${host}/dashboard`
      return NextResponse.redirect(redirectUrl)
    }
  }

  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('error', 'Auth callback failed')
  return NextResponse.redirect(redirectUrl)
}
