'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Globe, Database, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { ApecGlobalSyncDialog } from '@/components/apec-global/apec-global-sync-dialog'
import { usePermissions } from '@/hooks/usePermissions'

export default function SettingsPage() {
  const router = useRouter()
  const { isOwner } = usePermissions()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
  })
  const [isApecModalOpen, setIsApecModalOpen] = useState(false)
  const [apecSecretKey, setApecSecretKey] = useState('')
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [savedSecretSuccess, setSavedSecretSuccess] = useState(false)

  useEffect(() => {
    const savedKey = localStorage.getItem('nix_apec_global_secret_key') || ''
    setApecSecretKey(savedKey)

    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }

        setUser(authUser)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setProfile(profileData)
        setFormData({
          full_name: profileData?.full_name || authUser.user_metadata?.full_name || '',
        })
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      if (!user) throw new Error('Không tìm thấy người dùng')

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess('Cập nhật hồ sơ thành công')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Lưu cài đặt thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Đang tải cài đặt...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Cài đặt</h1>

      {/* Profile Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Cài đặt hồ sơ</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Không thể thay đổi email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập họ và tên của bạn"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-slate-400"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Thông tin tài khoản</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">Mã người dùng (ID)</p>
            <p className="text-sm font-mono bg-slate-50 px-3 py-2 rounded mt-1">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Thành viên từ</p>
            <p className="text-sm mt-1">{new Date(profile?.created_at || '').toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Google Account Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Tài khoản Google</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {(profile?.google_avatar_url || profile?.avatar_url || user?.user_metadata?.picture) ? (
              <img
                src={profile?.google_avatar_url || profile?.avatar_url || user?.user_metadata?.picture}
                alt="Google Avatar"
                className="w-14 h-14 rounded-full border-2 border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Đã xác thực qua Google
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Tài khoản được xác thực thông qua Google OAuth. Không cần mật khẩu.
          </p>
        </div>
      </div>

      {/* APEC GLOBAL API Integration */}
      {isOwner && (
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                Tích hợp bên ngoài (API APEC GLOBAL)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Cổng kết nối dữ liệu APEC GLOBAL</h2>
            <p className="text-sm text-blue-200/80 mt-1 max-w-xl">
              Kết nối trực tiếp tới máy chủ <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-100 font-mono">https://api.apecglobal.net</code> sử dụng chữ ký bảo mật X-Secret-Key để bổ sung dữ liệu Công ty, Dự án, Nhân sự và Công việc vào hệ thống.
            </p>
          </div>

          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-blue-300 animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
            <p className="text-xs text-blue-200">1. Công ty</p>
            <p className="text-xs font-mono font-bold mt-0.5 text-white truncate">/externals/companies</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
            <p className="text-xs text-blue-200">2. Dự án</p>
            <p className="text-xs font-mono font-bold mt-0.5 text-white truncate">/externals/projects</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
            <p className="text-xs text-blue-200">3. Nhân viên</p>
            <p className="text-xs font-mono font-bold mt-0.5 text-white truncate">/externals/employees</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
            <p className="text-xs text-blue-200">4. Công việc</p>
            <p className="text-xs font-mono font-bold mt-0.5 text-white truncate">/externals/tasks</p>
          </div>
        </div>

        {/* Security configuration box */}
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Khóa bảo mật X-Secret-Key (Buộc nhập thủ công để bảo mật tuyệt đối)</span>
            </label>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
              Lưu cục bộ an toàn
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showSecretKey ? "text" : "password"}
                value={apecSecretKey}
                onChange={(e) => setApecSecretKey(e.target.value)}
                placeholder="Nhập khóa X-Secret-Key (vd: nhập secret key được cấp)"
                className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-300 hover:text-white"
              >
                {showSecretKey ? "Ẩn" : "Hiện"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('nix_apec_global_secret_key', apecSecretKey.trim())
                setSavedSecretSuccess(true)
                setTimeout(() => setSavedSecretSuccess(false), 3000)
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 font-bold text-sm text-white rounded-lg transition-all shadow flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savedSecretSuccess ? "Đã lưu!" : "Lưu khóa bảo mật"}</span>
            </button>
          </div>
          <p className="text-[11px] text-blue-200/70 mt-2">
            * Khóa bảo mật sẽ được truyền qua Header <code className="bg-white/10 px-1 rounded">X-Secret-Key</code> cho mọi truy vấn API tới <code className="bg-white/10 px-1 rounded">api.apecglobal.net</code>.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-blue-200">
            <span>Trạng thái khóa:</span>
            {apecSecretKey ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Đã nhập thủ công
              </span>
            ) : (
              <span className="text-amber-300 font-bold">Chưa cấu hình</span>
            )}
          </div>

          <button
            onClick={() => setIsApecModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-blue-50 font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Mở Trung tâm Đồng bộ APEC GLOBAL</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <ApecGlobalSyncDialog open={isApecModalOpen} onOpenChange={setIsApecModalOpen} />
        </div>
      )}
    </div>
  )
}
