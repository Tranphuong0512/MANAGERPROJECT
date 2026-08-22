'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ShieldX, LogOut, ArrowRight, ShieldCheck } from 'lucide-react'

export default function AccessDeniedPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleTryAnother = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 mb-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
            <ShieldX className="w-9 h-9 text-white" />
          </div>

          {/* Message */}
          <h1 className="text-xl font-bold text-white mb-3">Truy cập bị từ chối</h1>
          <p className="text-sm text-red-200/70 leading-relaxed mb-6">
            Tài khoản của bạn đã bị quản trị viên từ chối truy cập vào hệ thống. Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
          </p>

          {/* Status */}
          <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-sm font-bold text-red-300">Trạng thái: Bị từ chối</span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Liên hệ quản trị viên</p>
            <p className="text-sm text-blue-300">tranphuong0512@gmail.com</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleTryAnother}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/80 hover:bg-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-500/20"
            >
              <ArrowRight className="w-4 h-4" />
              Đăng nhập bằng tài khoản khác
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
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
