'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Lightbulb } from 'lucide-react'

interface CreateImprovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  projectId?: string
  projects?: any[]
  members?: any[]
  onSaved?: () => void
}

export function CreateImprovementDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  projects = [],
  members = [],
  onSaved,
}: CreateImprovementDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    module: '',
    impact_level: 'medium',
    project_id: projectId || '',
    checklist_item_id: '',
    assigned_to: '',
    reporter_id: '',
  })

  const [checklistItems, setChecklistItems] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, project_id: projectId || '', assigned_to: '', reporter_id: '' }))
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

      if (!formData.title) throw new Error('Vui lòng nhập đề xuất cải tiến')

      // Get org id of the selected project
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

      // Insert improvement
      const { error: insertError } = await supabase
        .from('improvements')
        .insert({
          project_id: formData.project_id,
          organization_id: targetOrgId,
          checklist_item_id: formData.checklist_item_id || null,
          title: formData.title,
          description: formData.description,
          module: formData.module,
          impact_level: formData.impact_level,
          status: 'pending',
          reporter_id: formData.reporter_id || user.id
        } as any)

      if (insertError) throw insertError

      // Log activity
      await supabase.from('project_activities').insert({
        project_id: formData.project_id,
        user_id: user.id,
        action_type: 'create_improvement',
        description: `Đã đề xuất cải tiến: ${formData.title}`
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        module: '',
        impact_level: 'medium',
        project_id: projectId || '',
        checklist_item_id: '',
        assigned_to: '',
        reporter_id: '',
      })
      
      onOpenChange(false)
      if (onSaved) onSaved()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Thêm cải tiến thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-purple-50">
          <h2 className="font-bold text-purple-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" /> Đề xuất cải tiến
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-purple-100 rounded-lg transition-colors text-purple-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Only show project selector when projects list is provided */}
          {projects.length > 0 && (
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dự án liên quan *</label>
              <select
                value={formData.project_id}
                onChange={e => setFormData({ ...formData, project_id: e.target.value, checklist_item_id: '' })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all"
                required
              >
                <option value="">-- Chọn dự án --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Công việc / Đầu việc liên quan</label>
              <select
                value={formData.checklist_item_id}
                onChange={e => setFormData({ ...formData, checklist_item_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all"
                disabled={!formData.project_id || checklistItems.length === 0}
              >
                <option value="">-- Không chỉ định --</option>
                {checklistItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.project_checklists?.title} {'>'} {item.title}
                  </option>
                ))}
              </select>
            </div>
            
            {members.length > 0 && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Người đề xuất cải tiến</label>
                <select
                  value={formData.reporter_id}
                  onChange={e => setFormData({ ...formData, reporter_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all"
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

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nội dung cải tiến *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: Tối ưu hoá câu truy vấn dữ liệu..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mô tả chi tiết</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả lý do và cách cải tiến..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all resize-none h-24"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Module / Component</label>
              <input
                type="text"
                value={formData.module}
                onChange={e => setFormData({ ...formData, module: e.target.value })}
                placeholder="VD: Authentication"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mức độ tác động</label>
              <select
                value={formData.impact_level}
                onChange={e => setFormData({ ...formData, impact_level: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 outline-none transition-all"
              >
                <option value="high">🔴 Tác động lớn</option>
                <option value="medium">🟠 Tác động vừa</option>
                <option value="low">⚪ Tác động nhỏ</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center gap-2"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Tạo đề xuất
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
