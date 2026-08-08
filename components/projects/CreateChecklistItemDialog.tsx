'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface CreateChecklistItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checklistId: string
  staff: any[]
  onCreated?: () => void
}

export function CreateChecklistItemDialog({
  open,
  onOpenChange,
  checklistId,
  staff,
  onCreated,
}: CreateChecklistItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    assigned_staff_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.title) throw new Error('Vui lòng nhập tên công việc')

      // Ghi trực tiếp lên server của APEC GLOBAL (không lưu trên supabase)
      const res = await fetch('/api/v1/apec-global/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          name: formData.title,
          checklist_id: checklistId,
          assigned_staff_id: formData.assigned_staff_id || null,
        }),
      });

      if (!res.ok && res.status !== 200) {
        console.warn('Lỗi từ máy chủ Apec Global:', await res.text());
      }

      if (formData.assigned_staff_id) {
        // Auto add member to project team
        const { data: checklistData } = await supabase.from('project_checklists').select('project_id').eq('id', checklistId).single()
        if (checklistData?.project_id) {
          const { data: existingMember } = await supabase.from('project_members')
            .select('id')
            .eq('project_id', checklistData.project_id)
            .eq('user_id', formData.assigned_staff_id)
            .maybeSingle()
            
          if (!existingMember) {
            const { data: memberRole } = await supabase.from('user_roles').select('id').eq('name', 'member').single()
            if (memberRole) {
              await supabase.from('project_members').insert({
                project_id: checklistData.project_id,
                user_id: formData.assigned_staff_id,
                role_id: memberRole.id
              } as any)
            }
          }
        }
      }

      setFormData({ title: '', assigned_staff_id: '' })
      onOpenChange(false)
      onCreated?.()
    } catch (err: any) {
      setError(err.message || 'Thêm công việc thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900">Thêm công việc</h2>
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
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Tên công việc *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Nhập tên công việc..."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Người phụ trách</label>
            <select
              value={formData.assigned_staff_id}
              onChange={(e) => setFormData({ ...formData, assigned_staff_id: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">-- Chưa gán --</option>
              {staff.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} {s.departments ? `(${s.departments.name})` : ''}
                </option>
              ))}
            </select>
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
              disabled={isLoading || !formData.title}
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
