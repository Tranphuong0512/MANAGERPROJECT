'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, ShieldCheck, KeyRound, Laptop } from 'lucide-react'

const STORAGE_KEY = 'nix_device_saved_credentials'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSavedOnDevice, setHasSavedOnDevice] = useState(false)

  // Khởi tạo: Đọc thông tin đăng nhập đã lưu riêng trên thiết bị này (nếu người dùng đã bật nhớ mật khẩu)
  useEffect(() => {
    try {
      const savedDataRaw = localStorage.getItem(STORAGE_KEY)
      if (savedDataRaw) {
        try {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(savedDataRaw))))
          if (decoded && decoded.remember) {
            if (decoded.email) setEmail(decoded.email)
            if (decoded.password) setPassword(decoded.password)
            setRememberMe(true)
            setHasSavedOnDevice(true)
            return
          }
        } catch {
          // Fallback parsing nếu dạng JSON thuần
          const parsed = JSON.parse(savedDataRaw)
          if (parsed && parsed.remember) {
            if (parsed.email) setEmail(parsed.email)
            if (parsed.password) setPassword(parsed.password)
            setRememberMe(true)
            setHasSavedOnDevice(true)
            return
          }
        }
      }

      // Fallback phiên bản cũ
      const savedEmail = localStorage.getItem('nix_remember_email')
      const savedRemember = localStorage.getItem('nix_remember_me')
      if (savedRemember === 'true' && savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    } catch (e) {
      console.warn('Không thể đọc thông tin lưu trên máy:', e)
    }
  }, [])

  // Xóa thông tin đã lưu trên thiết bị
  const handleClearSavedOnDevice = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('nix_remember_email')
    localStorage.removeItem('nix_remember_password')
    localStorage.removeItem('nix_remember_me')
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
        try {
          const payload = {
            email: email.trim(),
            password,
            remember: true,
            savedAt: new Date().toISOString()
          }
          const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
          localStorage.setItem(STORAGE_KEY, encoded)
          localStorage.setItem('nix_remember_email', email.trim())
          localStorage.setItem('nix_remember_me', 'true')
        } catch (e) {
          console.warn('Lỗi lưu mật khẩu cục bộ:', e)
        }
      } else {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem('nix_remember_email')
        localStorage.removeItem('nix_remember_password')
        localStorage.setItem('nix_remember_me', 'false')
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Cơ sở dữ liệu chưa được cấu hình. Vui lòng liên hệ hỗ trợ.')
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra')
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

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
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
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-slate-400 font-medium">Hoặc tiếp tục với</span>
          </div>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-slate-50 hover:bg-slate-100 active:scale-[0.99] text-slate-700 font-semibold py-2.5 rounded-xl border border-slate-200 transition-all text-xs flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Đăng nhập bằng Google
        </Button>

        <div className="mt-6 text-center text-[11px] text-slate-400">
          <span>NIX.AI • Bản quyền © 2026 Trần Phương</span>
        </div>
      </div>
    </div>
  )
}
