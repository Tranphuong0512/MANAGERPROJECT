'use client'

import { useState } from 'react'
import { X, Mail } from 'lucide-react'
import { assignEmailToUser } from '@/app/actions/user-actions'

interface AssignEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  onEmailAssigned?: () => void
}

export function AssignEmailDialog({
  open,
  onOpenChange,
  member,
  onEmailAssigned,
}: AssignEmailDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!email) throw new Error('Vui lòng nhập email')
      if (!member?.user_id) throw new Error('Không tìm thấy ID nhân sự')

      const result = await assignEmailToUser(member.user_id, email)

      if (!result.success) {
        throw new Error(result.error)
      }

      setEmail('')
      onOpenChange(false)
      onEmailAssigned?.()
    } catch (err: any) {
      setError(err.message || 'Gán email thất bại. Vui lòng kiểm tra lại cấu hình Supabase Service Role Key.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open || !member) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Gán Email cho Nhân sự
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
            Đang gán email cho nhân sự: <strong>{member.profiles?.full_name}</strong>.
            <br />
            Hệ thống sẽ cập nhật email và gửi một đường link đặt lại mật khẩu đến email này để nhân sự có thể đăng nhập.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Địa chỉ Email thật *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: nguyenvan.a@congty.com"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-slate-400"
            >
              {isLoading ? 'Đang gán...' : 'Xác nhận gán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
