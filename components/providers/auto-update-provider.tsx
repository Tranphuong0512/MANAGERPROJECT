'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles, X, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck, Zap, DownloadCloud, Loader2 } from 'lucide-react'
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
  downloadPercent: number
  isReadyToRestart: boolean
  checkNow: (showNoUpdateToast?: boolean) => Promise<void>
  dismissUpdate: () => void
  applyUpdateAndRestart: () => void
}

const AutoUpdateContext = createContext<AutoUpdateContextType>({
  updateInfo: null,
  isChecking: false,
  downloadPercent: 0,
  isReadyToRestart: false,
  checkNow: async () => {},
  dismissUpdate: () => {},
  applyUpdateAndRestart: () => {},
})

export const useAutoUpdate = () => useContext(AutoUpdateContext)

export function AutoUpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [isReadyToRestart, setIsReadyToRestart] = useState(false)
  const simTimerRef = useRef<NodeJS.Timeout | null>(null)

  const applyUpdateAndRestart = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).electron?.quitAndInstall) {
      (window as any).electron.quitAndInstall()
    } else {
      window.location.reload()
    }
  }, [])

  // Setup Electron IPC listeners if available
  useEffect(() => {
    if (typeof window === 'undefined') return
    const electron = (window as any).electron
    if (!electron) return

    const cleanupProgress = electron.onUpdateProgress?.((progressObj: any) => {
      if (progressObj?.percent != null) {
        const p = Math.min(100, Math.max(0, Math.round(progressObj.percent)))
        setDownloadPercent(p)
        if (p >= 100) {
          setIsReadyToRestart(true)
        }
      }
    })

    const cleanupDownloaded = electron.onUpdateDownloaded?.(() => {
      setDownloadPercent(100)
      setIsReadyToRestart(true)
    })

    return () => {
      cleanupProgress?.()
      cleanupDownloaded?.()
    }
  }, [])

  // Start smooth progress animation if real progress is waiting
  useEffect(() => {
    if (updateInfo?.update_available && !isReadyToRestart) {
      if (simTimerRef.current) clearInterval(simTimerRef.current)

      let current = downloadPercent > 0 ? downloadPercent : 12
      setDownloadPercent(current)

      simTimerRef.current = setInterval(() => {
        setDownloadPercent((prev) => {
          if (prev >= 96) {
            return prev
          }
          const increment = Math.floor(Math.random() * 8) + 4
          return Math.min(96, prev + increment)
        })
      }, 1200)

      return () => {
        if (simTimerRef.current) clearInterval(simTimerRef.current)
      }
    }
  }, [updateInfo?.update_available, isReadyToRestart])

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
            `🚀 Đã phát hiện phiên bản mới v${data.latest_version}. Hệ thống đang tự động tải và cập nhật trong nền...`,
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
    <AutoUpdateContext.Provider
      value={{
        updateInfo,
        isChecking,
        downloadPercent,
        isReadyToRestart,
        checkNow,
        dismissUpdate,
        applyUpdateAndRestart
      }}
    >
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
                    {isReadyToRestart
                      ? `Đã tải hoàn tất phiên bản v${updateInfo.latest_version}`
                      : `Phát hiện phiên bản mới v${updateInfo.latest_version}`}
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
            <div className="p-4 bg-gradient-to-r from-blue-950/60 to-slate-900/80 border border-cyan-400/30 rounded-xl mb-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-200">
                  {isReadyToRestart ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Đã tải xong 100% - Sẵn sàng áp dụng</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Đang tải ngầm gói nâng cấp...</span>
                    </>
                  )}
                </div>
                <span className="text-xs font-black text-cyan-300 font-mono">
                  {downloadPercent}%
                </span>
              </div>

              {/* Realtime Animated Progress Bar */}
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-cyan-500/30 mb-2.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 shadow-sm shadow-cyan-400"
                  style={{ width: `${downloadPercent}%` }}
                ></div>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed">
                {isReadyToRestart
                  ? 'Gói cài đặt đã được tải về hoàn tất và sẵn sàng áp dụng. Ứng dụng sẽ khởi động lại để hoàn tất nâng cấp.'
                  : 'Hệ thống đang tự động tải gói cài đặt trong nền. Quý khách có thể tiếp tục làm việc bình thường.'}
              </p>
            </div>

            {/* Release Notes (if any) */}
            {updateInfo.release_notes && (
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-[11px] text-slate-300 mb-3.5 max-h-20 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                <span className="font-semibold text-slate-200 block mb-1">Nội dung cập nhật:</span>
                {updateInfo.release_notes}
              </div>
            )}

            {/* Action Confirmation Button (Only Dismiss or Restart) */}
            {isReadyToRestart ? (
              <button
                onClick={applyUpdateAndRestart}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] animate-pulse"
              >
                <RefreshCw className="w-4 h-4" />
                Khởi động lại để hoàn tất nâng cấp ngay
              </button>
            ) : (
              <button
                onClick={() => setIsDismissed(true)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <ShieldCheck className="w-4 h-4" />
                Ẩn thông báo (Hệ thống tiếp tục tự tải trong nền)
              </button>
            )}

          </div>
        </div>
      )}
    </AutoUpdateContext.Provider>
  )
}
