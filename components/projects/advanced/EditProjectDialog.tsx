'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, User, AlertTriangle, Type, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { customAlert, customConfirm } from '@/utils/alert'
import { getVietnamDateString } from '@/lib/utils'

export function EditProjectDialog({ 
  isOpen, 
  onClose, 
  project, 
  organizationId,
  onUpdated 
}: Readonly<{ 
  isOpen: boolean, 
  onClose: () => void, 
  project: any,
  organizationId: string,
  onUpdated: (newProject: any) => void 
}>) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planning',
    start_date: getVietnamDateString(project?.start_date),
    end_date: getVietnamDateString(project?.end_date),
    budget: project?.budget || 0,
    manager_id: project?.manager_id || '',
    priority: project?.priority || 'medium',
    client: project?.client || '',
    department: project?.department || ''
  })
  const [staffList, setStaffList] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: project?.name || '',
        description: project?.description || '',
        status: project?.status || 'planning',
        start_date: getVietnamDateString(project?.start_date),
        end_date: getVietnamDateString(project?.end_date),
        budget: project?.budget || 0,
        manager_id: project?.manager_id || '',
        priority: project?.priority || 'medium',
        client: project?.client || '',
        department: project?.department || ''
      })
      fetchStaff()
    }
  }, [isOpen, project])

  // Convert APEC numeric ID to a deterministic UUID for Supabase compatibility
  const apecIdToUuid = (numericId: string | number): string => {
    const padded = String(numericId).padStart(12, '0');
    return `a0ec0000-0000-4000-a000-${padded}`;
  };

  const isValidUuid = (val: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const fetchStaff = async () => {
    const uniqueMembers = new Map<string, { id: string; full_name: string }>();

    // 1. APEC GLOBAL employees
    try {
      const res = await fetch('/api/v1/apec-global/employees').then(r => r.json()).catch(() => ({ success: false, items: [] }));
      if (res && res.items) {
        res.items.forEach((e: any) => {
          const name = (e.fullname || e.name || '').trim();
          const rawId = String(e.id || '');
          if (name && rawId) {
            // Convert numeric APEC ID to a valid UUID for Supabase staff table
            const uuid = isValidUuid(rawId) ? rawId : apecIdToUuid(rawId);
            uniqueMembers.set(uuid, { id: uuid, full_name: name });
          }
        });
      }
    } catch (err) {
      console.warn('Cannot fetch apec employees:', err);
    }

    setStaffList(Array.from(uniqueMembers.values()));
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Auto-sync real user into the legacy staff table to satisfy database constraints
      const managerObj = staffList.find(s => s.id === formData.manager_id);
      if (formData.manager_id && managerObj) {
        await supabase.from('staff').upsert({
          id: managerObj.id,
          organization_id: organizationId,
          full_name: managerObj.full_name
        }, { onConflict: 'id' }).select();
      }

      const payload: any = {
        id: project.id,
        organization_id: organizationId,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget,
        manager_id: formData.manager_id || null,
        priority: formData.priority,
        client: formData.client || null,
        department: formData.department || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('projects')
        .upsert(payload, { onConflict: 'id' })
        .select(`*, staff!projects_manager_id_fkey(full_name)`)
        .maybeSingle()

      if (error) throw error

      const resData = data || payload;
      const updatedProject = {
        ...resData,
        staff: resData.staff || (managerObj ? { full_name: managerObj.full_name } : null),
        manager: managerObj?.full_name || resData.manager || project.manager
      };

      // Đồng bộ sang APEC GLOBAL
      try {
        await fetch('/api/v1/apec-global/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: project.id,
            name: formData.name,
            description: formData.description,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date,
            manager_id: formData.manager_id,
            manager_name: managerObj?.full_name
          })
        });
      } catch (e) {
        console.warn('Lỗi đồng bộ Apec Global khi chỉnh sửa dự án:', e);
      }

      onUpdated(updatedProject)
      
      // Log activity
      await supabase.from('project_activities').insert({
        project_id: project.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'update_info',
        description: 'Đã cập nhật thông tin chung của dự án'
      })
      
      onClose()
    } catch (err) {
      console.error(err)
      await customAlert('Lỗi cập nhật dự án')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">Cập nhật thông tin dự án</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div>
            <label htmlFor="projectName" className="block text-xs font-semibold text-slate-700 mb-1">Tên dự án</label>
            <div className="relative">
              <Type className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                id="projectName"
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên dự án..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="projectDetailedDesc" className="block text-xs font-semibold text-slate-700 mb-1">Mô tả dự án & Chi tiết</label>
            <textarea
              id="projectDetailedDesc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm h-24 resize-none"
              placeholder="Nhập mô tả chi tiết về dự án..."
            />
          </div>

          <div>
            <label htmlFor="projectStatus" className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái dự án</label>
            <div className="relative">
              <Activity className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
              <select 
                id="projectStatus"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full pl-9 pr-4 py-2.5 bg-blue-50/60 border border-blue-200 hover:border-blue-400 rounded-xl text-sm font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
              >
                <option value="planning">Lên kế hoạch</option>
                <option value="active">Đang thực hiện</option>
                <option value="completed">Hoàn thành</option>
                <option value="archived">Lưu trữ / Đã hủy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="projectClient" className="block text-sm font-medium text-slate-700 mb-1">
                Khách hàng / Đối tác
              </label>
              <input
                id="projectClient"
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                placeholder="VD: VinGroup, FPT..."
              />
            </div>
            <div>
              <label htmlFor="projectDepartment" className="block text-sm font-medium text-slate-700 mb-1">
                Phòng ban phụ trách
              </label>
              <input
                id="projectDepartment"
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                placeholder="VD: Phòng IT, Marketing..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="projectStart" className="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  id="projectStart"
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="projectEnd" className="block text-xs font-semibold text-slate-700 mb-1">Ngày kết thúc (Dự kiến)</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  id="projectEnd"
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="projectBudget" className="block text-xs font-semibold text-slate-700 mb-1">Ngân sách (VNĐ)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                id="projectBudget"
                type="number"
                value={formData.budget}
                onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập ngân sách..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="projectManager" className="block text-xs font-semibold text-slate-700 mb-1">Người phụ trách (PM)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select 
                  id="projectManager"
                  value={formData.manager_id}
                  onChange={e => setFormData({...formData, manager_id: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn quản lý --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="projectPriority" className="block text-xs font-semibold text-slate-700 mb-1">Mức độ ưu tiên</label>
              <div className="relative">
                <AlertTriangle className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select 
                  id="projectPriority"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
