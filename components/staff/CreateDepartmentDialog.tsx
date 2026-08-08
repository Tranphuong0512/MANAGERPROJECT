'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface CreateDepartmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  onCreated?: () => void
}

export function CreateDepartmentDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: CreateDepartmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.name) {
        throw new Error('Vui lòng nhập tên phòng ban')
      }

      const { error: insertError } = await supabase
        .from('departments')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          description: formData.description,
        } as any)

      if (insertError) throw insertError

      setFormData({ name: '', description: '' })
      onOpenChange(false)
      onCreated?.()
    } catch (err: any) {
      setError(err.message || 'Thêm phòng ban thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Thêm phòng ban mới</h2>
          <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Tên phòng ban *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Ví dụ: Phòng IT, Phòng Marketing..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Mô tả chức năng của phòng ban..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Đang lưu...' : 'Thêm phòng ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
