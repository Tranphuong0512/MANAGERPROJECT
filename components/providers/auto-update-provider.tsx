'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Sparkles, Download, ExternalLink, X, RefreshCw, CheckCircle2 } from 'lucide-react'
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
  exe_download_url?: string
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
            `🚀 Đã phát hiện phiên bản mới v${data.latest_version}. Ứng dụng đang tự động nâng cấp trong nền...`,
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

    // Poll GitHub for releases every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      checkNow(false)
    }, 300000)

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

      {/* Floating Realtime Update Banner Popup */}
      {updateInfo && updateInfo.update_available && !isDismissed && (
        <div className="fixed bottom-6 right-6 z-[999999] max-w-md w-full animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-2xl border-2 border-blue-500/40 backdrop-blur-xl relative overflow-hidden">
            
            {/* Background Accent Blur */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-start justify-between gap-3 relative z-10 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center flex-shrink-0 text-blue-400 animate-pulse">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ⚡ Tự Động Nâng Cấp
                    </span>
                    <span className="text-xs font-bold text-emerald-400">v{updateInfo.latest_version}</span>
                  </div>
                  <h4 className="font-extrabold text-base text-white mt-0.5">
                    {updateInfo.release_name || `Đã có bản cập nhật v${updateInfo.latest_version}`}
                  </h4>
                </div>
              </div>

              <button
                onClick={dismissUpdate}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Release Notes */}
            {updateInfo.release_notes && (
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-slate-300 mb-4 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {updateInfo.release_notes}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
              <span>Hiện tại: <strong className="text-slate-200">v{updateInfo.current_version}</strong></span>
              <span>Mới nhất: <strong className="text-emerald-400 font-bold">v{updateInfo.latest_version}</strong></span>
            </div>

            {/* Status & Auto Progress Notice */}
            <div className="flex items-center justify-between gap-2 p-3 bg-blue-900/30 border border-blue-400/20 rounded-xl mb-3">
              <div className="flex items-center gap-2 text-xs text-blue-200">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                <span>Hệ thống đang tự động tải và áp dụng bản nâng cấp...</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDismissed(true)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Đã hiểu (Tự động cập nhật)
              </button>

              {updateInfo.exe_download_url && (
                <a
                  href={updateInfo.exe_download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center gap-1.5"
                  title="Tải thủ công"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải EXE
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </AutoUpdateContext.Provider>
  )
}
