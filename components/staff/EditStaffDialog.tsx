'use client'

import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'

interface EditStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  staff: any
  onSaved?: () => void
}

export function EditStaffDialog({
  open,
  onOpenChange,
  organizationId,
  staff,
  onSaved,
}: EditStaffDialogProps) {
  const { organizations, isSuperAdmin } = useOrganization()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [allDepartments, setAllDepartments] = useState<any[]>([])

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    phone: '',
    email: '',
    password: '',
    organization_ids: [] as string[],
    department_ids: [] as string[]
  })

  // Fetch departments for all organizations the user belongs to (or all if super admin)
  useEffect(() => {
    if (open) {
      const loadDepts = async () => {
        const { data } = await supabase.from('departments').select('id, name, organization_id').is('deleted_at', null)
        if (data) setAllDepartments(data)
      }
      loadDepts()
    }
  }, [open])

  useEffect(() => {
    if (open && staff) {
      // Fetch staff current organizations and departments
      const loadStaffDetails = async () => {
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select(`
            id, organization_id,
            member_departments(department_id)
          `)
          .eq('user_id', staff.id)
          .is('deleted_at', null)
        
        let orgIds: string[] = []
        let deptIds: string[] = []

        if (orgMembers) {
          orgIds = orgMembers.map(m => m.organization_id)
          orgMembers.forEach(m => {
            if (m.member_departments) {
              m.member_departments.forEach((md: any) => deptIds.push(md.department_id))
            }
          })
        }

        setFormData({
          full_name: staff.full_name || '',
          role: staff.role !== '-' ? staff.role : '',
          phone: staff.phone !== '-' ? staff.phone : '',
          email: '', // Only for super admin to overwrite
          password: '', // Only for super admin to overwrite
          organization_ids: orgIds.length > 0 ? orgIds : (organizationId ? [organizationId] : []),
          department_ids: deptIds
        })
      }
      loadStaffDetails()
      setError(null)
    }
  }, [open, staff, organizationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.full_name) {
        throw new Error('Vui lòng nhập Họ và tên')
      }
      if (organizations.length > 0 && formData.organization_ids.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 Tổ chức')
      }

      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: staff.id,
          full_name: formData.full_name,
          organization_ids: formData.organization_ids,
          department_ids: formData.department_ids,
          role: formData.role,
          phone: formData.phone,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật nhân sự thất bại')
      }

      onOpenChange(false)
      onSaved?.()
    } catch (err: any) {
      setError(err.message || 'Cập nhật nhân sự thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleOrg = (orgId: string) => {
    setFormData(prev => {
      const isSelected = prev.organization_ids.includes(orgId)
      if (isSelected) {
        return {
          ...prev,
          organization_ids: prev.organization_ids.filter(id => id !== orgId),
          // Also remove departments belonging to this org
          department_ids: prev.department_ids.filter(dId => {
            const d = allDepartments.find(x => x.id === dId)
            return d?.organization_id !== orgId
          })
        }
      } else {
        return {
          ...prev,
          organization_ids: [...prev.organization_ids, orgId]
        }
      }
    })
  }

  const toggleDept = (deptId: string) => {
    setFormData(prev => {
      const isSelected = prev.department_ids.includes(deptId)
      if (isSelected) {
        return { ...prev, department_ids: prev.department_ids.filter(id => id !== deptId) }
      } else {
        return { ...prev, department_ids: [...prev.department_ids, deptId] }
      }
    })
  }

  if (!open || !staff) return null

  // Group departments by organization
  const availableOrgs = organizations.filter(o => formData.organization_ids.includes(o.id))

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin nhân sự</h2>
          <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Họ và tên *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Số điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Chức vụ chung</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {isSuperAdmin && (
              <>
                <div className="col-span-2 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-xs">⚡</span>
                    Khu vực Super Admin (Cập nhật Tài khoản)
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Email mới (để trống nếu không đổi)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Nhập email mới..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Mật khẩu mới (để trống nếu không đổi)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-semibold text-slate-800 mb-3">Tổ chức trực thuộc</label>
            <div className="grid grid-cols-2 gap-3">
              {organizations.map(org => (
                <div 
                  key={org.id}
                  onClick={() => toggleOrg(org.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.organization_ids.includes(org.id) 
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                    formData.organization_ids.includes(org.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {formData.organization_ids.includes(org.id) && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{org.name}</span>
                </div>
              ))}
            </div>
          </div>

          {availableOrgs.length > 0 && (
            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-semibold text-slate-800 mb-3">Phân bổ Phòng ban</label>
              <div className="space-y-4">
                {availableOrgs.map(org => {
                  const depts = allDepartments.filter(d => d.organization_id === org.id)
                  if (depts.length === 0) return null
                  
                  return (
                    <div key={org.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        {org.name}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {depts.map(dept => (
                          <div 
                            key={dept.id}
                            onClick={() => toggleDept(dept.id)}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <div className={`w-4 h-4 rounded-sm flex items-center justify-center border ${
                              formData.department_ids.includes(dept.id) 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'border-slate-300 group-hover:border-blue-400'
                            }`}>
                              {formData.department_ids.includes(dept.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm text-slate-700">{dept.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 mt-6 shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
