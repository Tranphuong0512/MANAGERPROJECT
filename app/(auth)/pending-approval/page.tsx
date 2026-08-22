'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Clock, LogOut, RefreshCw, Mail, ShieldCheck } from 'lucide-react'

export default function PendingApprovalPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [dotCount, setDotCount] = useState(1)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)
    }
    loadUser()
  }, [router])

  // Auto-check every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleCheckStatus(true)
    }, 15000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prev => prev >= 3 ? 1 : prev + 1)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  const handleCheckStatus = async (silent = false) => {
    if (!silent) setIsChecking(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', authUser.id)
        .single()

      if (profile?.approval_status === 'approved') {
        router.push('/dashboard')
      } else if (profile?.approval_status === 'rejected') {
        router.push('/auth/access-denied')
      }
    } catch (err) {
      console.error('Check status error:', err)
    } finally {
      if (!silent) setIsChecking(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const email = user?.email || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8 text-center">
          {/* Animated Clock Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Clock className="w-9 h-9 text-white" />
            </div>
          </div>

          {/* User Avatar + Info */}
          {user && (
            <div className="mb-6">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/20 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white/20">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-white font-bold text-lg">{displayName}</p>
              <p className="text-blue-300/80 text-sm flex items-center justify-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {email}
              </p>
            </div>
          )}

          {/* Status Message */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white mb-2">
              Tài khoản đang chờ phê duyệt{'.'.repeat(dotCount)}
            </h1>
            <p className="text-sm text-blue-200/70 leading-relaxed">
              Yêu cầu truy cập của bạn đã được ghi nhận. Quản trị viên sẽ xem xét và phê duyệt trong thời gian sớm nhất.
            </p>
          </div>

          {/* Status Indicator */}
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
              <span className="text-sm font-bold text-amber-300">Trạng thái: Đang chờ duyệt</span>
            </div>
            <p className="text-xs text-amber-200/60">Hệ thống tự động kiểm tra mỗi 15 giây</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => handleCheckStatus(false)}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/80 hover:bg-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-500/20"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium rounded-xl transition-all text-sm border border-white/10"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NIX.AI • Hệ thống xác thực Google bảo mật</span>
          </div>
        </div>
      </div>
    </div>
  )
}
