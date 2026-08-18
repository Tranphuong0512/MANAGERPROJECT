'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Sparkles, X, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { showToast } from '@/utils/alert'

interface UpdateInfo {
  update_available: boolean
  current_version: string
  latest_version: string
  release_tag?: string
  release_name?: string
  release_notes?: string
  published_at?: string
  download_url?: string
  repo_url?: string
  error?: string
}

interface AutoUpdateContextType {
  updateInfo: UpdateInfo | null
  isChecking: boolean
  checkNow: (showNoUpdateToast?: boolean) => Promise<void>
  dismissUpdate: () => void
}

const AutoUpdateContext = createContext<AutoUpdateContextType>({
  updateInfo: null,
  isChecking: false,
  checkNow: async () => {},
  dismissUpdate: () => {},
})

export const useAutoUpdate = () => useContext(AutoUpdateContext)

export function AutoUpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const checkNow = useCallback(async (showNoUpdateToast: boolean = false) => {
    setIsChecking(true)
    try {
      const res = await fetch('/api/v1/system/check-update', { cache: 'no-store' })
      const data: UpdateInfo = await res.json().catch(() => null)

      if (data) {
        setUpdateInfo(data)
        if (data.update_available) {
          setIsDismissed(false)
          showToast(
            'info',
            `🚀 Đã phát hiện phiên bản mới v${data.latest_version}. Hệ thống đang tự động tải và nâng cấp trong nền...`,
            'TỰ ĐỘNG NÂNG CẤP'
          )
        } else if (showNoUpdateToast) {
          showToast(
            'info',
            `Bạn đang sử dụng phiên bản mới nhất v${data.current_version}.`,
            'HỆ THỐNG ĐÃ CẬP NHẬT'
          )
        }
      }
    } catch (err) {
      console.warn('Auto update check failed:', err)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    // Initial check after 3 seconds
    const timer = setTimeout(() => {
      checkNow(false)
    }, 3000)

    // Poll GitHub for releases every 3 minutes (180,000 ms)
    const interval = setInterval(() => {
      checkNow(false)
    }, 180000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [checkNow])

  const dismissUpdate = () => {
    setIsDismissed(true)
  }

  return (
    <AutoUpdateContext.Provider value={{ updateInfo, isChecking, checkNow, dismissUpdate }}>
      {children}

      {/* Floating Realtime Automatic Update Modal / Banner */}
      {updateInfo && updateInfo.update_available && !isDismissed && (
        <div className="fixed bottom-6 right-6 z-[999999] max-w-md w-full animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-2xl border-2 border-cyan-500/50 backdrop-blur-2xl relative overflow-hidden ring-1 ring-white/20">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-start justify-between gap-3 relative z-10 mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center flex-shrink-0 text-cyan-300 shadow-lg shadow-cyan-500/20 animate-bounce">
                  <Zap className="w-6 h-6 fill-cyan-400/30 text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> TỰ ĐỘNG NÂNG CẤP
                    </span>
                    <span className="text-xs font-extrabold text-cyan-300">v{updateInfo.latest_version}</span>
                  </div>
                  <h4 className="font-extrabold text-base text-white mt-1 leading-snug">
                    Phát hiện phiên bản mới v{updateInfo.latest_version}
                  </h4>
                </div>
              </div>

              <button
                onClick={dismissUpdate}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Thu nhỏ thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Version Transition Badge */}
            <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 mb-3.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Hiện tại: <strong className="text-white font-semibold">v{updateInfo.current_version}</strong>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Mới nhất: <strong className="text-cyan-300 font-bold">v{updateInfo.latest_version}</strong>
              </span>
            </div>

            {/* Status & Automated Background Progress Notice */}
            <div className="p-3.5 bg-gradient-to-r from-blue-900/40 to-cyan-950/40 border border-cyan-400/30 rounded-xl mb-3.5 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                </div>
                <div className="text-xs leading-relaxed space-y-1">
                  <p className="font-bold text-cyan-200">
                    Đang tải ngầm và tự động cài đặt bản mới...
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    Xin vui lòng chờ trong giây lát. Hệ thống sẽ tự động áp dụng bản nâng cấp và khởi động lại khi hoàn tất. Quý khách có thể tiếp tục làm việc bình thường.
                  </p>
                </div>
              </div>
            </div>

            {/* Release Notes (if any) */}
            {updateInfo.release_notes && (
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-[11px] text-slate-300 mb-3.5 max-h-20 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                <span className="font-semibold text-slate-200 block mb-1">Nội dung cập nhật:</span>
                {updateInfo.release_notes}
              </div>
            )}

            {/* Action Confirmation Button (Only Dismiss/Acknowledge) */}
            <button
              onClick={() => setIsDismissed(true)}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4" />
              Đã hiểu (Hệ thống tự động nâng cấp ngầm)
            </button>

          </div>
        </div>
      )}
    </AutoUpdateContext.Provider>
  )
}

