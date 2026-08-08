'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { generateUUID } from '@/lib/utils'
import { X } from 'lucide-react'
import { useOrganization } from '@/components/providers/organization-provider'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  onProjectCreated?: () => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  onProjectCreated,
}: Readonly<CreateProjectDialogProps>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { organizations } = useOrganization()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    organization_id: organizationId || '',
    client: '',
    department: '',
    manager_id: ''
  })
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([])

  useEffect(() => {
    if (open) {
      if (organizationId) {
        setFormData(prev => ({ ...prev, organization_id: organizationId }))
      } else if (organizations && organizations.length > 0) {
        setFormData(prev => ({ ...prev, organization_id: organizations[0].id }))
      }
      fetchStaff()
    }
  }, [open, organizationId, organizations])

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
    } catch (error) {
      console.error('Error fetching API employees:', error);
    }

    setStaffList(Array.from(uniqueMembers.values()));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Chưa đăng nhập')
      
      if (!formData.organization_id) {
        throw new Error('Vui lòng chọn hoặc tạo một công ty / tổ chức trước khi tạo dự án.')
      }

      const managerObj = staffList.find(s => s.id === formData.manager_id);
      if (formData.manager_id && managerObj) {
        await supabase.from('staff').upsert({
          id: managerObj.id,
          organization_id: formData.organization_id,
          full_name: managerObj.full_name
        }, { onConflict: 'id' }).select();
      }

      const projectId = generateUUID()
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
            id: projectId,
            organization_id: formData.organization_id,
            name: formData.name,
            description: formData.description,
            status: formData.status,
            client: formData.client || null,
            department: formData.department || null,
            manager_id: formData.manager_id || null,
            created_by: user.id,
        } as any)

      if (insertError) throw insertError

      // Also add the creator as a project member
      await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: user.id
        } as any)

      setFormData({ name: '', description: '', status: 'planning', organization_id: organizationId || '', client: '', department: '', manager_id: '' })
      onOpenChange(false)
      onProjectCreated?.()
    } catch (err: any) {
      setError(err.message || 'Tạo dự án thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Tạo dự án</h2>
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
            <label htmlFor="org_id" className="block text-sm font-medium text-slate-900 mb-1">
              Công ty / Tổ chức *
            </label>
            <select
              id="org_id"
              value={formData.organization_id}
              onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Chọn tổ chức...</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-1">
              Tên dự án *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên dự án"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-900 mb-1">
              Mô tả
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập mô tả dự án"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-900 mb-1">
              Trạng thái
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="planning">Lên kế hoạch</option>
              <option value="active">Đang chạy</option>
              <option value="completed">Hoàn thành</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>

          <div>
            <label htmlFor="client" className="block text-sm font-medium text-slate-900 mb-1">
              Khách hàng / Đối tác
            </label>
            <input
              id="client"
              type="text"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: VinGroup, FPT..."
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-slate-900 mb-1">
              Phòng ban phụ trách
            </label>
            <input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Phòng IT, Marketing..."
            />
          </div>

          <div>
            <label htmlFor="manager" className="block text-sm font-medium text-slate-900 mb-1">
              Người phụ trách (PM)
            </label>
            <select
              id="manager"
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn quản lý --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
