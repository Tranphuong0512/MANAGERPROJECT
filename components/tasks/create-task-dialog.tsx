'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onTaskCreated?: () => void
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  })

  useEffect(() => {
    if (open && projectId) {
      loadProjectMembers()
    }
  }, [open, projectId])

  const loadProjectMembers = async () => {
    try {
      // First get project's organization_id
      const { data: projectData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (projectData) {
        const { data } = await supabase
          .from('organization_members')
          .select(`
            user_id,
            profiles (id, full_name, avatar_url)
          `)
          .eq('organization_id', projectData.organization_id)
          .is('deleted_at', null)

        if (data) {
          // Remove duplicates if any user has multiple roles/teams
          const uniqueProfiles = Array.from(
            new Map(data.map(om => om.profiles).filter(Boolean).map(p => [(p as any).id || (p as any)[0]?.id, p])).values()
          )
          setTeam(uniqueProfiles)
        }
      }
    } catch (err) {
      console.error('Error loading team:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Chưa đăng nhập')
      
      if (!projectId) {
        throw new Error('Vui lòng chọn hoặc tạo một dự án trước khi tạo công việc.')
      }

      const { error: insertError } = await supabase
        .from('tasks')
        .insert([
          {
            project_id: projectId,
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assigned_to: formData.assigned_to || null,
            due_date: formData.due_date || null,
            created_by: user.id,
          },
        ])

      if (insertError) throw insertError

      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assigned_to: '',
        due_date: '',
      })
      onOpenChange(false)
      onTaskCreated?.()
    } catch (err: any) {
      setError(err.message || 'Tạo công việc thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Tạo công việc</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Tiêu đề công việc *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tiêu đề công việc"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập mô tả công việc"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="todo">Cần làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="in_review">Chờ duyệt</option>
                <option value="done">Hoàn thành</option>
                <option value="blocked">Bị chặn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Độ ưu tiên
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="critical">Nghiêm trọng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Giao cho
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Chưa giao</option>
              {team.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name || 'Không rõ'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Hạn chót
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              disabled={isLoading || !formData.title}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-slate-400"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
