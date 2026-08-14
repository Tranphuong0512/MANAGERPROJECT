'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, User, FolderOpen, Lightbulb, Edit2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { customAlert, customConfirm } from '@/utils/alert'

interface ImprovementSlideOverProps {
  improvement: any | null
  members?: any[]
  onClose: () => void
  canEdit?: boolean
}

export function ImprovementSlideOver({ improvement: initialImprovement, members = [], onClose, canEdit = true }: ImprovementSlideOverProps) {
  const [improvement, setImprovement] = useState(initialImprovement)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    impact_level: '',
    status: '',
    module: '',
    reporter_id: '',
    assigned_to: '',
    department_id: ''
  })

  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    if (initialImprovement) {
      setImprovement(initialImprovement)
      setFormData({
        title: initialImprovement.title || '',
        description: initialImprovement.description || '',
        impact_level: initialImprovement.impact_level || 'medium',
        status: initialImprovement.status || 'pending',
        module: initialImprovement.module || '',
        reporter_id: initialImprovement.reporter_id || '',
        assigned_to: initialImprovement.assigned_to || '',
        department_id: initialImprovement.department_id || ''
      })
      setIsEditing(false)

      const loadDepartments = async () => {
        if (!initialImprovement.organization_id) return
        const { data } = await supabase.from('departments').select('id, name').eq('organization_id', initialImprovement.organization_id).order('name')
        setDepartments(data || [])
      }
      loadDepartments()
    } else {
      setImprovement(null)
    }
  }, [initialImprovement])

  if (!improvement) return null

  const getImpactStyle = (s: string) => {
    if (s === 'high') return 'text-red-700 bg-red-50 border-red-200'
    if (s === 'medium') return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getImpactText = (s: string) => {
    if (s === 'high') return '🔴 Cao'
    if (s === 'medium') return '🟠 Trung bình'
    return '⚪ Thấp'
  }

  const getStatusStyle = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'pending' || str === 'todo' || str.includes('chưa')) return 'text-slate-600 bg-slate-50'
    if (str === '2' || str === 'in_progress' || str === 'evaluating' || str.includes('đang')) return 'text-blue-600 bg-blue-50'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'text-purple-600 bg-purple-50'
    if (str === '4' || str === 'implemented' || str === 'done' || str === 'approved' || str.includes('hoàn thành')) return 'text-emerald-600 bg-emerald-50'
    if (str === '5' || str === 'rejected' || str === 'closed' || str.includes('đóng')) return 'text-slate-500 bg-slate-100'
    return 'text-slate-500 bg-slate-100'
  }

  const getStatusText = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'pending' || str === 'todo' || str.includes('chưa')) return 'Chưa thực hiện'
    if (str === '2' || str === 'in_progress' || str === 'evaluating' || str.includes('đang')) return 'Đang thực hiện'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'Chờ duyệt'
    if (str === '4' || str === 'implemented' || str === 'done' || str === 'approved' || str.includes('hoàn thành')) return 'Hoàn thành'
    if (str === '5' || str === 'rejected' || str === 'closed' || str.includes('đóng')) return 'Đóng'
    return 'Chưa thực hiện'
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('improvements')
        .update({
          title: formData.title,
          description: formData.description,
          impact_level: formData.impact_level,
          status: formData.status,
          module: formData.module,
          reporter_id: formData.reporter_id || null,
          assigned_to: formData.assigned_to || null,
          department_id: formData.department_id || null
        })
        .eq('id', improvement.id)

      if (error) throw error

      if (improvement.checklist_item_id) {
        const newItemStatus = formData.status === 'implemented' ? 'done'
          : formData.status === 'review' ? 'review'
          : formData.status === 'in_progress' ? 'in_progress'
          : formData.status === 'rejected' ? 'todo'
          : 'todo';
        const newProgress = newItemStatus === 'done' || newItemStatus === 'review' ? 100 : (newItemStatus === 'in_progress' ? 50 : 0);
        await supabase.from('checklist_items').update({
          status: newItemStatus,
          progress: newProgress,
          is_completed: newItemStatus === 'done',
          updated_at: new Date().toISOString()
        }).eq('id', improvement.checklist_item_id);
      }

      const rawTargetId = String(improvement.checklist_item_id || improvement.id || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|ea_inc_|ea_imp_|inc_|imp_|t_)+/i, '');
      const isNumericApec = /^\d+$/.test(rawTargetId);

      if (isNumericApec) {
        try {
          const isCompleted = formData.status === 'implemented';
          const syncProgress = isCompleted ? 100 : (formData.status === 'review' ? 100 : (formData.status === 'in_progress' ? 50 : 0));
          const syncStatus = isCompleted ? 'done' : (formData.status === 'review' ? 'review' : (formData.status === 'in_progress' ? 'in_progress' : 'todo'));
          await fetch('/api/v1/apec-global/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: Number(rawTargetId),
              title: formData.title,
              name: formData.title,
              description: formData.description,
              status: syncStatus,
              is_completed: isCompleted,
              process: syncProgress,
              progress: syncProgress
            })
          });
        } catch (apecErr) {
          console.warn('Lỗi đồng bộ cải tiến lên APEC GLOBAL:', apecErr);
        }
      }
      
      const newReporter = members.find(m => m.id === formData.reporter_id)
      const newAssignee = members.find(m => m.id === formData.assigned_to)

      setImprovement({ 
        ...improvement, 
        ...formData,
        reporter: newReporter ? { full_name: newReporter.full_name } : improvement.reporter,
        assignee: newAssignee ? { full_name: newAssignee.full_name } : improvement.assignee
      })
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      await customAlert('Có lỗi xảy ra khi lưu.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-50 shadow-2xl z-50 flex flex-col border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Chi tiết cải tiến</h2>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && improvement.status !== 'implemented' && improvement.status !== 'rejected' && (
              <>
                {isEditing ? (
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Sửa
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">IMP-{improvement.id.substring(0,4).toUpperCase()}</span>
              {!isEditing && (
                <>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getImpactStyle(improvement.impact_level)}`}>
                    {getImpactText(improvement.impact_level)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(improvement.status)}`}>
                    {getStatusText(improvement.status)}
                  </span>
                </>
              )}
            </div>
            
            {isEditing ? (
              <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full text-xl font-bold text-slate-900 leading-tight mb-4 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500" 
              />
            ) : (
              <h3 className="text-xl font-bold text-slate-900 leading-tight mb-4">{improvement.title}</h3>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-28 flex items-center gap-2 text-slate-500">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">Dự án</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">
                  {improvement.projectName || improvement.projects?.name || improvement.project_name || (improvement.apec_sync_metadata?.project_name as string) || 'Chưa xác định'}
                </span>
              </div>

              {isEditing && (
                <div className="flex items-center gap-4 text-[13px]">
                  <div className="w-28 flex items-center gap-2 text-slate-500">
                    <FolderOpen className="w-4 h-4" />
                    <span className="font-medium">Phân hệ</span>
                  </div>
                  <input 
                    type="text" 
                    value={formData.module} 
                    onChange={e => setFormData({...formData, module: e.target.value})}
                    className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500" 
                  />
                </div>
              )}
              {!isEditing && improvement.module && (
                <div className="flex items-center gap-4 text-[13px]">
                  <div className="w-28 flex items-center gap-2 text-slate-500">
                    <FolderOpen className="w-4 h-4" />
                    <span className="font-medium">Phân hệ</span>
                  </div>
                  <span className="font-semibold text-slate-800 flex-1">{improvement.module}</span>
                </div>
              )}
              
              {isEditing ? (
                <>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <FolderOpen className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Bộ phận</span>
                    </div>
                    <select 
                      value={formData.department_id} 
                      onChange={e => setFormData({...formData, department_id: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Chưa phân công</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Người ghi nhận</span>
                    </div>
                    <select 
                      value={formData.reporter_id} 
                      onChange={e => setFormData({...formData, reporter_id: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Chưa rõ</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Người thực hiện</span>
                    </div>
                    <select 
                      value={formData.assigned_to} 
                      onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Chưa phân công</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <FolderOpen className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Bộ phận</span>
                    </div>
                    <span className="font-semibold text-slate-800 flex-1">
                      {departments.find(d => d.id === improvement.department_id)?.name || 'Chưa phân công'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Người ghi nhận</span>
                    </div>
                    <span className="font-semibold text-slate-800 flex-1">{improvement.reporter?.full_name || 'Chưa rõ'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Người thực hiện</span>
                    </div>
                    <span className="font-semibold text-slate-800 flex-1">{improvement.assignee?.full_name || 'Chưa phân công'}</span>
                  </div>
                </>
              )}

              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-28 flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Thời gian</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">{improvement.created_at ? new Date(improvement.created_at).toLocaleString('vi-VN') : ''}</span>
              </div>

              {isEditing && (
                <>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <span className="font-medium">Tác động</span>
                    </div>
                    <select 
                      value={formData.impact_level} 
                      onChange={e => setFormData({...formData, impact_level: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none"
                    >
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <span className="font-medium">Trạng thái</span>
                    </div>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none"
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="in_progress">Đang thực hiện</option>
                      <option value="implemented">Đã áp dụng</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3">Mô tả chi tiết</h3>
            {isEditing ? (
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded p-2 outline-none focus:border-blue-500 min-h-[100px]" 
              />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {improvement.description || 'Không có mô tả chi tiết.'}
              </p>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
