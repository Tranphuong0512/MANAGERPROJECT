'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Calendar, AlertTriangle, PlayCircle, Trash2, Search, ChevronDown, Check } from 'lucide-react'
import { customAlert, customConfirm } from '@/utils/alert'

const isUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

interface ChecklistItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checklistId: string
  itemToEdit?: any // If provided, we are in Edit mode
  staff: any[]
  taskTypes?: any[] // List of task types from APEC GLOBAL
  projectId?: string
  organizationId?: string
  onSaved?: () => void
}

export function ChecklistItemDialog({
  open,
  onOpenChange,
  checklistId,
  itemToEdit,
  staff,
  taskTypes = [],
  projectId,
  organizationId,
  onSaved,
}: ChecklistItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChecklistId, setSelectedChecklistId] = useState(checklistId || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/v1/apec-global/departments')
        .then(r => r.json())
        .then(res => {
          if (res.items && Array.isArray(res.items)) {
            setDepartmentsList(res.items);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    assignee_ids: [] as string[],
    start_date: '',
    end_date: '',
    priority: 'medium',
    progress: 0,
    status: 'todo',
    kpi_item_id: 47,
    target_value: 0,
    min_count_reject: 2,
    max_count_reject: 3
  })

  useEffect(() => {
    if (open) {
      const defaultTypeId = itemToEdit?.rawApecTask?.type?.id || itemToEdit?.type_id || itemToEdit?.checklist_id || (taskTypes && taskTypes.length > 0 ? taskTypes[0].id : '');
      setSelectedChecklistId(defaultTypeId);
      if (itemToEdit) {
        setFormData({
          title: itemToEdit.title || itemToEdit.name || '',
          description: itemToEdit.description || itemToEdit.rawApecTask?.description || '',
          department: itemToEdit.department || itemToEdit.department_name || itemToEdit.rawApecTask?.department || '',
          assignee_ids: itemToEdit.assignee_ids || (itemToEdit.assignees ? itemToEdit.assignees.map((a: any) => a.id) : (itemToEdit.assigned_staff_id ? [itemToEdit.assigned_staff_id] : [])),
          start_date: itemToEdit.start_date ? new Date(itemToEdit.start_date).toISOString().split('T')[0] : '',
          end_date: itemToEdit.end_date ? new Date(itemToEdit.end_date).toISOString().split('T')[0] : '',
          priority: itemToEdit.priority || 'medium',
          progress: itemToEdit.progress || 0,
          status: itemToEdit.status || 'todo',
          kpi_item_id: itemToEdit.kpi_item_id || itemToEdit.rawApecTask?.kpi_item?.id || 47,
          target_value: itemToEdit.target_value || itemToEdit.rawApecTask?.target_value || 0,
          min_count_reject: itemToEdit.min_count_reject || 2,
          max_count_reject: itemToEdit.max_count_reject || 3
        })
      } else {
        setFormData({
          title: '',
          description: '',
          department: '',
          assignee_ids: [],
          start_date: '',
          end_date: '',
          priority: 'medium',
          progress: 0,
          status: 'todo',
          kpi_item_id: 47,
          target_value: 0,
          min_count_reject: 2,
          max_count_reject: 3
        })
      }
    }
  }, [open, itemToEdit, checklistId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.title) throw new Error('Vui lòng nhập tên công việc')

      const targetChecklistId = selectedChecklistId || checklistId;
      const payload = {
        checklist_id: targetChecklistId,
        title: formData.title,
        description: formData.description,
        assignee_ids: formData.assignee_ids,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        priority: formData.priority,
        progress: Number(formData.progress),
        status: Number(formData.progress) === 100 ? 'done' : formData.status,
        is_completed: Number(formData.progress) === 100,
        kpi_item_id: Number(formData.kpi_item_id || 47),
        target_value: Number(formData.target_value || 0),
        min_count_reject: Number(formData.min_count_reject || 2),
        max_count_reject: Number(formData.max_count_reject || 3)
      }
      
      if (projectId) {
        (payload as any).project_id = projectId;
      }

      if (itemToEdit) {
        // Ghi lên APEC GLOBAL API (PUT)
        const cleanId = String(itemToEdit.id).replace(/^apec_/, '');
        const cleanChecklistId = String(targetChecklistId).replace(/^apec_type_t_/, '').replace(/^apec_type_/, '').replace(/^apec_/, '');
        let apecSuccess = false;
        try {
          const res = await fetch('/api/v1/apec-global/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              id: cleanId,
              checklist_id: cleanChecklistId,
              type_task: cleanChecklistId,
              type_id: cleanChecklistId,
              name: payload.title,
              title: payload.title,
              description: formData.description,
              employees: formData.assignee_ids.map(id => Number(String(id).replace(/^apec_emp_/, '').replace(/^apec_/, ''))),
              kpi_item_id: Number(formData.kpi_item_id || 47),
              target_value: Number(formData.target_value || 0),
              min_count_reject: Number(formData.min_count_reject || 2),
              max_count_reject: Number(formData.max_count_reject || 3),
              date_start: payload.start_date,
              date_end: payload.end_date,
              process: payload.progress,
              project_id: projectId ? String(projectId).replace(/^apec_prj_/, '').replace(/^apec_/, '') : undefined
            }),
          });
          const resJson = await res.json().catch(() => ({}));
          if (res.ok && resJson && resJson.success !== false) {
            apecSuccess = true;
            customAlert('✅ Cập nhật công việc thành công lên máy chủ APEC GLOBAL!');
          } else {
            const errMsg = resJson.error || resJson.message || 'Chưa cập nhật thành công lên máy chủ APEC GLOBAL';
            customAlert(`❌ ${errMsg}`);
          }
        } catch (apecErr: any) {
          console.warn('Lỗi khi cập nhật trên APEC GLOBAL:', apecErr);
          customAlert(`❌ Chưa cập nhật thành công lên máy chủ APEC GLOBAL: ${apecErr.message || 'Vui lòng thử lại'}`);
        }

        if (isUuid(itemToEdit.id) && isUuid(targetChecklistId)) {
          const { error: updateError } = await supabase
            .from('checklist_items')
            .update(payload)
            .eq('id', itemToEdit.id)
          if (updateError && !apecSuccess) throw updateError
        }
      } else {
        // Ghi lên APEC GLOBAL API (POST)
        const cleanChecklistId = Number(String(targetChecklistId).replace(/^apec_type_t_/, '').replace(/^apec_type_/, '').replace(/^apec_/, '').replace(/^t_/, '')) || 6;
        const cleanProjectId = Number(String(projectId || '').replace(/^apec_prj_/, '').replace(/^apec_/, '').replace(/^p-/, '')) || 65;
        const cleanCompanyId = Number(String(organizationId || '').replace(/^apec_org_/, '').replace(/^apec_/, '').replace(/^org_/, '')) || 6;
        const kpiId = Number(formData.kpi_item_id || 47);
        let targetVal = Number(formData.target_value);
        if (kpiId === 47 || kpiId === 48) {
          targetVal = 100;
        } else if (!targetVal || targetVal <= 0) {
          targetVal = kpiId === 45 ? 1000000 : 1;
        }
        let apecSuccess = false;
        try {
          const res = await fetch('/api/v1/apec-global/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: payload.title,
              description: formData.description || '',
              date_start: payload.start_date || new Date().toISOString().split('T')[0],
              date_end: payload.end_date || new Date().toISOString().split('T')[0],
              type_task: cleanChecklistId,
              project_id: cleanProjectId,
              company_id: cleanCompanyId,
              company: cleanCompanyId,
              organization_id: cleanCompanyId,
              employees: (formData.assignee_ids && formData.assignee_ids.length > 0)
                ? formData.assignee_ids.map(id => Number(String(id).replace(/^apec_emp_/, '').replace(/^apec_/, ''))).filter(n => !isNaN(n) && n > 0)
                : [16],
              kpi_item_id: kpiId,
              target_value: targetVal,
              min_count_reject: Number(formData.min_count_reject || 2),
              max_count_reject: Number(formData.max_count_reject || 3),
              priority: formData.priority === 'high' ? 3 : (formData.priority === 'low' ? 1 : 2),
              process: payload.progress || 0,
              task_status: payload.progress === 100 ? 4 : (formData.status === 'review' ? 3 : (formData.status === 'in_progress' ? 2 : 1))
            }),
          });
          const resJson = await res.json().catch(() => ({}));
          if (res.ok && resJson && resJson.success !== false) {
            apecSuccess = true;
            customAlert('✅ Tạo mới công việc thành công lên máy chủ APEC GLOBAL!');
          } else {
            const errMsg = resJson.error || resJson.message || 'Chưa cập nhật thành công lên máy chủ APEC GLOBAL';
            customAlert(`❌ ${errMsg}`);
          }
        } catch (apecErr: any) {
          console.warn('Lỗi khi thêm trên APEC GLOBAL:', apecErr);
          customAlert(`❌ Chưa cập nhật thành công lên máy chủ APEC GLOBAL: ${apecErr.message || 'Vui lòng thử lại'}`);
        }

        if (isUuid(targetChecklistId)) {
          const { error: insertError } = await supabase
            .from('checklist_items')
            .insert(payload)
          if (insertError && !apecSuccess) throw insertError
        }
      }

      if (formData.assignee_ids && formData.assignee_ids.length > 0 && isUuid(checklistId)) {
        // Auto add members to project team
        const { data: checklistData } = await supabase.from('project_checklists').select('project_id').eq('id', checklistId).maybeSingle()
        if (checklistData?.project_id) {
          const { data: memberRole } = await supabase.from('user_roles').select('id').eq('name', 'member').maybeSingle()
          if (memberRole) {
            for (const uid of formData.assignee_ids) {
              const { data: existingMember } = await supabase.from('project_members')
                .select('id')
                .eq('project_id', checklistData.project_id)
                .eq('user_id', uid)
                .maybeSingle()
                
              if (!existingMember) {
                await supabase.from('project_members').insert({
                  project_id: checklistData.project_id,
                  user_id: uid,
                  role_id: memberRole.id
                } as any)
              }
            }
          }
        }
      }

      onOpenChange(false)
      onSaved?.()
    } catch (err: any) {
      const displayMsg = err.message || 'Lưu công việc thất bại';
      setError(displayMsg);
      customAlert(`❌ Lỗi đồng bộ APEC GLOBAL: ${displayMsg}`);
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!itemToEdit || !(await customConfirm('Bạn có chắc chắn muốn xóa công việc này?'))) return
    setIsLoading(true)
    try {
      // Xóa trên APEC GLOBAL API
      try {
        const cleanId = String(itemToEdit.id).replace(/^apec_/, '');
        await fetch('/api/v1/apec-global/tasks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cleanId, ids: [cleanId] }),
        });
      } catch (apecErr) {
        console.warn('Lỗi khi xóa trên APEC GLOBAL:', apecErr);
      }

      if (isUuid(itemToEdit.id)) {
        await supabase.from('checklist_items').delete().eq('id', itemToEdit.id);
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      console.warn('Lỗi khi xóa công việc:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 text-lg">{itemToEdit ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {taskTypes && taskTypes.length > 0 && (
              <div>
                <label htmlFor="targetChecklist" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Loại nhiệm vụ (Bắt buộc)
                </label>
                <select
                  id="targetChecklist"
                  value={selectedChecklistId}
                  onChange={(e) => setSelectedChecklistId(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 bg-blue-50/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-900 cursor-pointer transition-all"
                >
                  {taskTypes.map((tt: any) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name || tt.title || `Loại ${tt.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="departmentSelect" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bộ phận / Phòng ban
              </label>
              <select
                id="departmentSelect"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-medium text-slate-800"
              >
                <option value="">-- Tất cả / Chưa phân bổ --</option>
                {departmentsList.map((d: any) => (
                  <option key={d.id} value={d.name || d.title || d.id}>
                    {d.name || d.title || `Bộ phận ${d.id}`}
                  </option>
                ))}
                {departmentsList.length === 0 && Array.from(new Set(staff.map((s: any) => s.department || (typeof s.departments === 'object' ? s.departments?.name : s.departments)).filter(Boolean))).map((deptName: any, idx) => (
                  <option key={idx} value={String(deptName)}>
                    {String(deptName)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tên nhiệm vụ *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              placeholder="Ví dụ: Xây dựng API login..."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mô tả chi tiết</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium resize-none"
              placeholder="Ví dụ: Nội dung mô tả công việc..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Chỉ tiêu KPI</label>
              <select
                value={formData.kpi_item_id}
                onChange={(e) => {
                  const kpiId = Number(e.target.value);
                  const newTarget = (kpiId === 47 || kpiId === 48) ? 100 : (kpiId === 49 ? 1 : (formData.target_value || 0));
                  setFormData({ ...formData, kpi_item_id: kpiId, target_value: newTarget });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-medium cursor-pointer"
              >
                <option value={47}>Hoàn thành nhiệm vụ (100%)</option>
                <option value={45}>Doanh thu (Tiền VNĐ)</option>
                <option value={48}>Chất lượng công việc (100%)</option>
                <option value={49}>Xử lý việc phát sinh (Số lần)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {formData.kpi_item_id === 45
                  ? 'Mục tiêu doanh thu (VNĐ) *'
                  : (formData.kpi_item_id === 49
                      ? 'Mục tiêu số lần xử lý *'
                      : 'Chỉ tiêu cần đạt (%) *')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                placeholder={formData.kpi_item_id === 47 || formData.kpi_item_id === 48 ? "100" : "0"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Người phụ trách</label>
              
              <div 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                  {formData.assignee_ids.length === 0 ? (
                    <span className="text-sm text-slate-400">Chọn người phụ trách...</span>
                  ) : (
                    <>
                      {formData.assignee_ids.slice(0, 2).map(id => {
                        const s = staff.find(x => x.id === id)
                        return s ? (
                          <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                            {s.full_name}
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation()
                                setFormData({...formData, assignee_ids: formData.assignee_ids.filter(x => x !== id)})
                              }} 
                              className="hover:text-blue-900 focus:outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                      {formData.assignee_ids.length > 2 && (
                        <span className="text-xs font-medium text-slate-500">
                          +{formData.assignee_ids.length - 2} người
                        </span>
                      )}
                    </>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên..." 
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-transparent focus:border-slate-300 focus:bg-white focus:outline-none rounded-lg transition-colors"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1.5">
                    {staff
                      .filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(s => {
                        const isSelected = formData.assignee_ids.includes(s.id);
                        return (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              if (isSelected) {
                                setFormData({...formData, assignee_ids: formData.assignee_ids.filter(id => id !== s.id)})
                              } else {
                                setFormData({...formData, assignee_ids: [...formData.assignee_ids, s.id]})
                              }
                            }}
                            className={`flex items-center gap-2.5 p-2 cursor-pointer rounded-md transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-sm font-medium text-slate-700 truncate">
                              {s.full_name} 
                              {s.departments && <span className="text-slate-400 font-normal ml-1">({s.departments.name})</span>}
                            </span>
                          </div>
                        )
                    })}
                    {staff.filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-4">Không tìm thấy kết quả</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mức độ ưu tiên</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày bắt đầu</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày kết thúc</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">SL vi phạm (min)</label>
              <input
                type="number"
                min="0"
                value={formData.min_count_reject}
                onChange={(e) => setFormData({ ...formData, min_count_reject: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white"
                placeholder="2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">SL vi phạm (max)</label>
              <input
                type="number"
                min="0"
                value={formData.max_count_reject}
                onChange={(e) => setFormData({ ...formData, max_count_reject: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white"
                placeholder="3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="todo">Chưa bắt đầu</option>
                <option value="in_progress">Đang xử lý</option>
                <option value="review">Đang kiểm duyệt</option>
                <option value="done">Hoàn thành</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>Tiến độ</span>
                <span className="text-blue-600">{formData.progress}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                className="w-full mt-2 accent-blue-600"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
            {itemToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Xóa
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !formData.title}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
