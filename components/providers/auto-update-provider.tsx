'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck, DownloadCloud, Loader2, Lock } from 'lucide-react'
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

    const cleanupAvailable = electron.onUpdateAvailable?.((info: any) => {
      setUpdateInfo((prev) => ({
        update_available: true,
        current_version: prev?.current_version || '',
        latest_version: info?.version || '',
        release_notes: info?.releaseNotes || prev?.release_notes
      }))
    })

    const cleanupProgress = electron.onUpdateProgress?.((progressObj: any) => {
      if (progressObj?.percent != null) {
        const p = Math.min(100, Math.max(0, Math.round(progressObj.percent)))
        setDownloadPercent((prev) => Math.max(prev, p))
        if (p >= 100) {
          setIsReadyToRestart(true)
        }
      }
    })

    const cleanupDownloaded = electron.onUpdateDownloaded?.((info: any) => {
      setDownloadPercent(100)
      setIsReadyToRestart(true)
      if (info?.version) {
        setUpdateInfo((prev) => prev ? { ...prev, update_available: true, latest_version: info.version } : { update_available: true, current_version: '', latest_version: info.version })
      }
    })

    return () => {
      cleanupAvailable?.()
      cleanupProgress?.()
      cleanupDownloaded?.()
    }
  }, [])

  // Animation mô phỏng khi ở môi trường Web thuần (dev / browser)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      // Trong Electron: Tiến trình tải thực tế từ IPC là 100% chính xác
      return
    }

    if (updateInfo?.update_available && !isReadyToRestart) {
      if (simTimerRef.current) clearInterval(simTimerRef.current)

      let current = downloadPercent > 0 ? downloadPercent : 15
      setDownloadPercent(current)

      simTimerRef.current = setInterval(() => {
        setDownloadPercent((prev) => {
          if (prev >= 98) return prev
          const increment = Math.floor(Math.random() * 8) + 4
          return Math.min(98, prev + increment)
        })
      }, 1200)

      return () => {
        if (simTimerRef.current) clearInterval(simTimerRef.current)
      }
    }
  }, [updateInfo?.update_available, isReadyToRestart, downloadPercent])

  const checkNow = useCallback(async (showNoUpdateToast: boolean = false) => {
    setIsChecking(true)
    try {
      const res = await fetch('/api/v1/system/check-update', { cache: 'no-store' })
      const data: UpdateInfo = await res.json().catch(() => null)

      if (data) {
        setUpdateInfo(data)
        if (showNoUpdateToast && !data.update_available) {
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
    // Initial check after 2 seconds
    const timer = setTimeout(() => {
      checkNow(false)
    }, 2000)

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
    // Bắt buộc cập nhật: Không cho phép đóng/ẩn khi có phiên bản mới
  }

  const hasNewUpdate = Boolean(updateInfo?.update_available)

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

      {/* Fullscreen Blocking Mandatory Update Modal Overlay */}
      {hasNewUpdate && updateInfo && (
        <div className="fixed inset-0 z-[9999999] bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-cyan-500/40 relative overflow-hidden ring-1 ring-white/15">
            
            {/* Ambient Background Glow Effects */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 text-center flex flex-col items-center">
              {/* Header Icon */}
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-500/25 mb-4 relative">
                {isReadyToRestart ? (
                  <Sparkles className="w-8 h-8 text-emerald-400 animate-bounce" />
                ) : (
                  <DownloadCloud className="w-8 h-8 text-cyan-300 animate-pulse" />
                )}
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-900"></span>
                </span>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 shadow-sm mb-3">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> BẢN CẬP NHẬT MỚI BẮT BUỘC
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-white text-center tracking-tight leading-tight uppercase">
                CÀI ĐẶT BẢN MỚI ĐỂ TIẾP TỤC SỬ DỤNG
              </h2>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-300 text-center mt-2.5 leading-relaxed max-w-md">
                Hệ thống đã phát hành phiên bản mới <strong className="text-cyan-300 font-bold">v{updateInfo.latest_version}</strong>. 
                Bạn cần hoàn tất cài đặt bản cập nhật này để tiếp tục sử dụng phần mềm và đảm bảo đồng bộ dữ liệu chuẩn xác.
              </p>

              {/* Version Comparison Card */}
              <div className="w-full flex items-center justify-between text-xs px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 my-4">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span>Hiện tại:</span>
                  <strong className="text-white font-bold">v{updateInfo.current_version || '3.7.0'}</strong>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="flex items-center gap-2 text-cyan-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Mới nhất:</span>
                  <strong className="text-cyan-300 font-black">v{updateInfo.latest_version}</strong>
                </div>
              </div>

              {/* Progress & Download Status Container */}
              <div className="w-full p-4 bg-gradient-to-r from-blue-950/70 to-slate-900/90 border border-cyan-400/30 rounded-2xl mb-4 text-left relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {isReadyToRestart ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-emerald-300">Đã tải xong 100% - Sẵn sàng cài đặt</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400 flex-shrink-0" />
                        <span className="text-cyan-200">Đang tự động tải gói nâng cấp...</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-black text-cyan-300 font-mono">
                    {downloadPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-black/70 rounded-full overflow-hidden p-0.5 border border-cyan-500/30 mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 shadow-sm shadow-cyan-400"
                    style={{ width: `${downloadPercent}%` }}
                  ></div>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {isReadyToRestart
                    ? 'Gói cài đặt đã sẵn sàng. Vui lòng bấm nút bên dưới để áp dụng ngay.'
                    : 'Hệ thống đang tải gói cập nhật trực tiếp tốc độ cao từ CDN. Vui lòng đợi trong giây lát...'}
                </p>
              </div>

              {/* Action Button */}
              {isReadyToRestart ? (
                <button
                  onClick={applyUpdateAndRestart}
                  className="w-full py-4 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] ring-2 ring-emerald-400/50 animate-pulse"
                >
                  <RefreshCw className="w-5 h-5" />
                  CÀI ĐẶT & KHỞI ĐỘNG LẠI NGAY
                </button>
              ) : (
                <div className="w-full py-3.5 px-6 rounded-2xl text-xs font-bold bg-slate-800/80 border border-cyan-500/30 text-cyan-200 flex items-center justify-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  Đang tải bản cập nhật ({downloadPercent}%)... Vui lòng đợi
                </div>
              )}

              {/* Security & Enforcement Notice */}
              <div className="text-[11px] text-slate-400 text-center mt-3.5 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Ứng dụng tạm khóa thao tác cho đến khi hoàn tất cài đặt bản mới</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </AutoUpdateContext.Provider>
  )
}
