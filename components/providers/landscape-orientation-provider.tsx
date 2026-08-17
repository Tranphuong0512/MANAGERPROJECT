'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { RotateCw, Maximize2, X } from 'lucide-react'

interface LandscapeContextType {
  isPortrait: boolean
  isMobileOrTablet: boolean
  isVirtualLandscape: boolean
  toggleVirtualLandscape: () => void
  requestFullscreenLandscape: () => Promise<void>
}

const LandscapeContext = createContext<LandscapeContextType>({
  isPortrait: false,
  isMobileOrTablet: false,
  isVirtualLandscape: false,
  toggleVirtualLandscape: () => {},
  requestFullscreenLandscape: async () => {},
})

export const useLandscape = () => useContext(LandscapeContext)

export function LandscapeOrientationProvider({ children }: { children: React.ReactNode }) {
  const [isPortrait, setIsPortrait] = useState<boolean>(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false)
  const [isVirtualLandscape, setIsVirtualLandscape] = useState<boolean>(false)
  const [showPrompt, setShowPrompt] = useState<boolean>(true)
  const [isDismissed, setIsDismissed] = useState<boolean>(false)

  // Kiểm tra kích thước và hướng xoay thiết bị
  const checkOrientation = useCallback(() => {
    if (typeof window === 'undefined') return

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isSmallScreen = window.innerWidth <= 1024 || (window.innerHeight <= 1024 && window.innerWidth <= 1366)
    const isMobileDevice = isTouch && isSmallScreen

    setIsMobileOrTablet(isMobileDevice)

    const isPortraitMode = window.innerHeight > window.innerWidth
    setIsPortrait(isPortraitMode)

    // Tự động thử khoá hướng xoay ngang khi thiết bị hỗ trợ
    if (isMobileDevice && 'orientation' in screen && 'lock' in (screen.orientation as any)) {
      try {
        (screen.orientation as any).lock('landscape').catch(() => {
          // Trình duyệt có thể yêu cầu fullscreen trước khi lock
        })
      } catch {}
    }
  }, [])

  useEffect(() => {
    checkOrientation()

    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [checkOrientation])

  // Kích hoạt toàn màn hình và tự động khoá xoay ngang
  const requestFullscreenLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen()
      }

      if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
        await (screen.orientation as any).lock('landscape')
      }
    } catch (err) {
      console.log('Screen orientation lock requires user rotation or virtual mode:', err)
      // Nếu thiết bị khoá xoay ngang hệ điều hành, bật giả lập xoay ngang
      setIsVirtualLandscape(true)
    }
  }

  const toggleVirtualLandscape = () => {
    setIsVirtualLandscape(prev => !prev)
  }

  return (
    <LandscapeContext.Provider
      value={{
        isPortrait,
        isMobileOrTablet,
        isVirtualLandscape,
        toggleVirtualLandscape,
        requestFullscreenLandscape,
      }}
    >
      <div className={isVirtualLandscape ? 'force-virtual-landscape' : ''}>
        {children}
      </div>

      {/* Floating Smart Rotation Assistant for Phones & Tablets in Portrait Mode */}
      {isMobileOrTablet && isPortrait && !isVirtualLandscape && showPrompt && !isDismissed && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                  <RotateCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Tối ưu chế độ xem ngang
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                    Xoay ngang điện thoại/tab để xem đầy đủ bảng giám sát & dự án tốt nhất.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={requestFullscreenLandscape}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Xoay toàn màn hình
              </button>
              <button
                onClick={toggleVirtualLandscape}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
                title="Buộc xoay ngang giao diện ngay cả khi máy bị khoá xoay dọc"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                Buộc xoay ngang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Mini Floating Switcher on Mobile/Tab */}
      {isMobileOrTablet && (
        <button
          onClick={() => {
            if (isVirtualLandscape) {
              setIsVirtualLandscape(false)
            } else if (isPortrait) {
              setIsVirtualLandscape(true)
            } else {
              requestFullscreenLandscape()
            }
          }}
          className={`fixed bottom-4 right-4 z-40 p-2.5 rounded-full shadow-lg border transition-all ${
            isVirtualLandscape
              ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/20'
              : 'bg-white/90 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-white'
          }`}
          title={isVirtualLandscape ? 'Trở về chế độ bình thường' : 'Chuyển sang chế độ xem xoay ngang'}
          aria-label="Toggle landscape view mode"
        >
          <RotateCw className={`w-4 h-4 ${isVirtualLandscape ? 'text-white' : 'text-blue-600'}`} />
        </button>
      )}
    </LandscapeContext.Provider>
  )
}
