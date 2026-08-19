'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, ShieldCheck, Laptop } from 'lucide-react'

const STORAGE_KEY = 'nix_device_saved_credentials'
const COOKIE_KEY = 'nix_saved_auth'

// Helper: Đọc cookie theo tên
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
  return match ? decodeURIComponent(match[3]) : null
}

// Helper: Ghi cookie lưu lâu dài
function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

// Helper: Xóa cookie
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSavedOnDevice, setHasSavedOnDevice] = useState(false)

  // Khởi tạo: Đọc thông tin đăng nhập đã lưu riêng trên máy này
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // 1. Ưu tiên 1: Đọc qua Electron IPC (Lưu trực tiếp vào userData của máy tính cài đặt)
        if (typeof window !== 'undefined' && (window as any).electron?.getSavedCredentials) {
          const electronCreds = await (window as any).electron.getSavedCredentials()
          if (electronCreds && electronCreds.remember) {
            if (electronCreds.email) setEmail(electronCreds.email)
            if (electronCreds.password) setPassword(electronCreds.password)
            setRememberMe(true)
            setHasSavedOnDevice(true)
            return
          }
        }

        // 2. Ưu tiên 2: Đọc qua LocalStorage
        const savedDataRaw = localStorage.getItem(STORAGE_KEY)
        if (savedDataRaw) {
          try {
            const parsed = JSON.parse(savedDataRaw)
            if (parsed && parsed.remember) {
              if (parsed.email) setEmail(parsed.email)
              if (parsed.password) setPassword(parsed.password)
              setRememberMe(true)
              setHasSavedOnDevice(true)
              return
            }
          } catch {
            try {
              const decoded = JSON.parse(decodeURIComponent(escape(atob(savedDataRaw))))
              if (decoded && decoded.remember) {
                if (decoded.email) setEmail(decoded.email)
                if (decoded.password) setPassword(decoded.password)
                setRememberMe(true)
                setHasSavedOnDevice(true)
                return
              }
            } catch {}
          }
        }

        // 3. Ưu tiên 3: Đọc qua Cookie dự phòng
        const cookieDataRaw = getCookie(COOKIE_KEY)
        if (cookieDataRaw) {
          try {
            const parsedCookie = JSON.parse(cookieDataRaw)
            if (parsedCookie && parsedCookie.remember) {
              if (parsedCookie.email) setEmail(parsedCookie.email)
              if (parsedCookie.password) setPassword(parsedCookie.password)
              setRememberMe(true)
              setHasSavedOnDevice(true)
              return
            }
          } catch {}
        }

        // 4. Fallback phiên bản cũ
        const savedEmail = localStorage.getItem('nix_remember_email')
        const savedRemember = localStorage.getItem('nix_remember_me')
        if (savedRemember === 'true' && savedEmail) {
          setEmail(savedEmail)
          setRememberMe(true)
        }
      } catch (e) {
        console.warn('Lỗi đọc thông tin đăng nhập đã lưu:', e)
      }
    }

    loadSavedCredentials()
  }, [])

  // Xóa thông tin đã lưu trên thiết bị
  const handleClearSavedOnDevice = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).electron?.clearSavedCredentials) {
        await (window as any).electron.clearSavedCredentials()
      }
    } catch (e) {
      console.warn('Electron clear error:', e)
    }

    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('nix_remember_email')
    localStorage.removeItem('nix_remember_password')
    localStorage.removeItem('nix_remember_me')
    deleteCookie(COOKIE_KEY)

    setEmail('')
    setPassword('')
    setRememberMe(false)
    setHasSavedOnDevice(false)
  }

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Cơ sở dữ liệu chưa được cấu hình. Vui lòng liên hệ hỗ trợ.')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message || 'Tài khoản hoặc mật khẩu không chính xác')
        return
      }

      // Quản lý lưu mật khẩu dành riêng cho từng máy cài
      if (rememberMe) {
        const payload = {
          email: email.trim(),
          password,
          remember: true,
          savedAt: new Date().toISOString()
        }
        const jsonStr = JSON.stringify(payload)

        // 1. Lưu vào Electron native store (File trong userData của máy tính)
        try {
          if (typeof window !== 'undefined' && (window as any).electron?.saveCredentials) {
            await (window as any).electron.saveCredentials(payload)
          }
        } catch (e) {
          console.warn('Electron save error:', e)
        }

        // 2. Lưu vào LocalStorage
        try {
          localStorage.setItem(STORAGE_KEY, jsonStr)
          localStorage.setItem('nix_remember_email', email.trim())
          localStorage.setItem('nix_remember_me', 'true')
        } catch (e) {
          console.warn('LocalStorage save error:', e)
        }

        // 3. Lưu vào Cookie dự phòng (1 năm)
        try {
          setCookie(COOKIE_KEY, jsonStr, 365)
        } catch (e) {
          console.warn('Cookie save error:', e)
        }
      } else {
        // Nếu bỏ chọn lưu mật khẩu -> xóa toàn bộ khỏi máy
        await handleClearSavedOnDevice()
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100/20 backdrop-blur-sm">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">NIX.AI - Quản Lý Dự Án</h1>
          <p className="text-xs text-slate-500 mt-1">Đăng nhập tài khoản để vào hệ thống giám sát</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
              Email đăng nhập
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              placeholder="ban@vidu.com"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-10 transition-all placeholder:text-slate-400"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Chế độ Lưu Mật Khẩu Dành Riêng Cho Máy Này */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-slate-400" />
                Lưu mật khẩu trên máy này
              </span>
            </label>

            {hasSavedOnDevice && (
              <button
                type="button"
                onClick={handleClearSavedOnDevice}
                className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Xóa thông tin đã lưu
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs mt-2"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-400">
          <span>NIX.AI • Bản quyền © 2026 Trần Phương</span>
        </div>
      </div>
    </div>
  )
}
