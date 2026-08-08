'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { createPlaceholderUser } from '@/app/actions/user-actions'

interface CreateMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberCreated?: () => void
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  onMemberCreated,
}: CreateMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [organizations, setOrganizations] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    fullName: '',
    organization_id: '',
    department_id: '',
    team_id: '',
  })

  useEffect(() => {
    if (open) {
      loadOrganizations()
    }
  }, [open])

  const loadOrganizations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (data && data.length > 0) {
      const orgs = data.map(d => d.organizations)
      setOrganizations(orgs)
      if (orgs.length > 0) {
        setFormData(prev => ({ ...prev, organization_id: (orgs[0] as any).id }))
        loadDepartments((orgs[0] as any).id)
      }
    }
  }

  const loadDepartments = async (orgId: string) => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    setDepartments(data || [])
    // We don't auto-select department so it's optional
  }

  const loadTeams = async (deptId: string) => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('department_id', deptId)
      .is('deleted_at', null)

    setTeams(data || [])
  }

  const handleOrgChange = (orgId: string) => {
    setFormData(prev => ({ ...prev, organization_id: orgId, department_id: '', team_id: '' }))
    loadDepartments(orgId)
    setTeams([])
  }

  const handleDeptChange = (deptId: string) => {
    setFormData(prev => ({ ...prev, department_id: deptId, team_id: '' }))
    if (deptId) {
      loadTeams(deptId)
    } else {
      setTeams([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.organization_id) throw new Error('Vui lòng chọn Công ty / Chi nhánh')
      if (!formData.fullName) throw new Error('Vui lòng nhập họ tên')

      // Call Server Action to create user
      const result = await createPlaceholderUser({
        fullName: formData.fullName,
        organizationId: formData.organization_id,
        departmentId: formData.department_id || undefined,
        teamId: formData.team_id || undefined,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setFormData({ fullName: '', organization_id: '', department_id: '', team_id: '' })
      onOpenChange(false)
      onMemberCreated?.()
    } catch (err: any) {
      setError(err.message || 'Tạo nhân sự thất bại. Vui lòng kiểm tra lại cấu hình Supabase Service Role Key.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Tạo Nhân sự (Giữ chỗ)</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
            Tính năng này tạo nhân sự mà <strong>không cần email</strong>. Bạn có thể gán email thật sau.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Họ và tên *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Nguyễn Văn A"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Công ty / Chi nhánh *
            </label>
            <select
              value={formData.organization_id}
              onChange={(e) => handleOrgChange(e.target.value)}
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
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Bộ phận / Phòng ban (Tùy chọn)
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!formData.organization_id}
            >
              <option value="">-- Không thuộc phòng ban nào --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Nhóm (Tùy chọn)
            </label>
            <select
              value={formData.team_id}
              onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!formData.department_id}
            >
              <option value="">-- Không thuộc nhóm nào --</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
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
              disabled={isLoading || !formData.fullName || !formData.organization_id}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-slate-400"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo nhân sự'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
