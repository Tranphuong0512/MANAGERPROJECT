'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { generateUUID } from '@/lib/utils'
import { X } from 'lucide-react'

interface CreateIncidentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  projectId?: string
  projects?: any[]
  members?: any[]
  onIncidentCreated?: () => void
}

export function CreateIncidentDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  projects = [],
  members = [],
  onIncidentCreated,
}: CreateIncidentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'new',
    project_id: projectId || '',
    checklist_item_id: '',
    assigned_to: '',
    reported_by: '',
  })

  const [checklistItems, setChecklistItems] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, project_id: projectId || '', assigned_to: '', reported_by: '' }))
    }
  }, [open, projectId])

  // Load checklist items when project changes
  useEffect(() => {
    const loadChecklistItems = async () => {
      if (!formData.project_id) {
        setChecklistItems([])
        return
      }

      const { data } = await supabase
        .from('checklist_items')
        .select('id, title, project_checklists!inner(project_id, title)')
        .eq('project_checklists.project_id', formData.project_id)
        .is('deleted_at', null)
        .order('title')
      
      setChecklistItems(data || [])
    }

    loadChecklistItems()
  }, [formData.project_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Chưa đăng nhập')
      const user = session.user
      
      if (!formData.project_id) {
        throw new Error('Vui lòng chọn dự án liên quan.')
      }

      // Get org_id: from projects list, or from props, or fetch directly from DB
      let targetOrgId = organizationId
      const selectedProject = projects.find(p => p.id === formData.project_id)
      if (selectedProject?.organization_id) {
        targetOrgId = selectedProject.organization_id
      } else if (!targetOrgId) {
        // Fetch from DB
        const { data: projData } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', formData.project_id)
          .single()
        targetOrgId = projData?.organization_id || ''
      }

      if (!targetOrgId) throw new Error('Không tìm thấy tổ chức của dự án')

      const incidentId = generateUUID()
      const { error: insertError } = await supabase
        .from('incidents')
        .insert({
          id: incidentId,
          project_id: formData.project_id,
          organization_id: targetOrgId,
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          status: formData.status,
          reported_by: formData.reported_by || user.id,
          checklist_item_id: formData.checklist_item_id || null,
        } as any)

      if (insertError) throw insertError

      setFormData({ title: '', description: '', severity: 'medium', status: 'new', project_id: projectId || '', checklist_item_id: '', assigned_to: '', reported_by: '' })
      onOpenChange(false)
      onIncidentCreated?.()
    } catch (err: any) {
      setError(err.message || 'Ghi nhận sự cố thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Ghi nhận sự cố mới</h2>
          <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Only show project selector when projects list is provided AND no projectId pre-set */}
          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Dự án liên quan *</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              >
                <option value="">Chọn dự án...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.project_id && checklistItems.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Mục công việc (Checklist item)</label>
              <select
                value={formData.checklist_item_id}
                onChange={(e) => setFormData({ ...formData, checklist_item_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="">-- Không liên kết --</option>
                {checklistItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.project_checklists.title} - {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {members.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Người báo cáo sự cố</label>
              <select
                value={formData.reported_by}
                onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="">-- Mặc định: tôi --</option>
                {members.map((m: any) => (
                  <option key={m.user_id || m.id} value={m.user_id || m.id}>
                    {m.profiles?.full_name || m.full_name || 'Không rõ'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Tiêu đề sự cố *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Mô tả ngắn gọn sự cố..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">Mô tả chi tiết</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Mô tả chi tiết nguyên nhân, hiện tượng, ảnh hưởng..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Mức độ</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="critical">🔴 Nghiêm trọng</option>
                <option value="high">🟠 Cao</option>
                <option value="medium">🟡 Trung bình</option>
                <option value="low">⚪ Thấp</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Trạng thái</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="new">Mới phát sinh</option>
                <option value="investigating">Đang điều tra</option>
                <option value="fixing">Đang sửa</option>
                <option value="resolved">Đã khắc phục</option>
                <option value="closed">Đã đóng</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Đang ghi nhận...' : 'Ghi nhận sự cố'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
