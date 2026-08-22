'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isMounted) {
          // Check approval status and super admin
          const { data: profile } = await supabase
            .from('profiles')
            .select('approval_status, is_super_admin')
            .eq('id', user.id)
            .single()

          if (profile?.is_super_admin || profile?.approval_status === 'approved') {
            router.replace('/dashboard')
            return
          } else if (profile?.approval_status === 'rejected') {
            router.replace('/access-denied')
            return
          } else {
            router.replace('/pending-approval')
            return
          }
        }
      } catch (err) {
        console.warn('Session check error:', err)
      } finally {
        if (isMounted) {
          setIsCheckingSession(false)
        }
      }
    }
    checkSession()

    return () => {
      isMounted = false
    }
  }, [router])

  // Check URL params for error
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      if (errorParam) {
        setError(errorParam)
      }
    }
  }, [])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Cơ sở dữ liệu chưa được cấu hình. Vui lòng liên hệ hỗ trợ.')
        setIsLoading(false)
        return
      }

      const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        setError(error.message || 'Không thể kết nối với Google. Vui lòng thử lại.')
        setIsLoading(false)
      }
      // If no error, the browser will be redirected to Google OAuth
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập')
      setIsLoading(false)
    }
  }

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100/20 backdrop-blur-sm">
          {/* Logo / Branding */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">NIX.AI - Quản Lý Dự Án</h1>
            <p className="text-sm text-slate-500 mt-1.5">Đăng nhập để vào hệ thống giám sát</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-md border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-3 text-sm active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {isLoading ? 'Đang kết nối Google...' : 'Đăng nhập bằng Google'}
          </Button>

          {/* Info notice */}
          <div className="mt-6 p-3 bg-blue-50/80 border border-blue-100 rounded-xl">
            <p className="text-[11px] text-blue-600/80 leading-relaxed text-center">
              <span className="font-bold">Lưu ý:</span> Tài khoản mới sẽ cần được quản trị viên phê duyệt trước khi có thể truy cập hệ thống.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[11px] text-slate-400">
            <span>NIX.AI • Bản quyền © 2026 Trần Phương</span>
          </div>
        </div>
      </div>
    </div>
  )
}
