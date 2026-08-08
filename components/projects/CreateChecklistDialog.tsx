'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

import { customAlert } from '@/utils/alert'

interface CreateChecklistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreated?: () => void
}

export function CreateChecklistDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: CreateChecklistDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!title) throw new Error('Vui lòng nhập tên checklist')

      // Ghi nhận trực tiếp lên server của APEC GLOBAL (không lưu vào supabase)
      const res = await fetch('/api/v1/apec-global/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, is_default: false, projects: [] }),
      });
      const resJson = await res.json().catch(() => ({}));

      if (res.ok && resJson && resJson.success !== false) {
        customAlert('✅ Tạo checklist mới thành công lên máy chủ APEC GLOBAL!');
      } else {
        const errMsg = resJson.error || resJson.message || 'Chưa tạo được checklist trên APEC GLOBAL';
        customAlert(`❌ ${errMsg}`);
      }

      setTitle('')
      onOpenChange(false)
      onCreated?.()
    } catch (err: any) {
      setError(err.message || 'Tạo checklist thất bại')
      customAlert(`❌ ${err.message || 'Tạo checklist thất bại'}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900">Tạo Checklist mới</h2>
          <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Tên nhóm công việc *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Ví dụ: Giao diện, Thanh toán..."
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !title}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
