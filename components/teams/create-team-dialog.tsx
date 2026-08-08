'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamCreated?: () => void
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
}: CreateTeamDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [organizations, setOrganizations] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: '',
    department_id: '',
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
    if (data && data.length > 0) {
      setFormData(prev => ({ ...prev, department_id: data[0].id }))
    } else {
      setFormData(prev => ({ ...prev, department_id: '' }))
    }
  }

  const handleOrgChange = (orgId: string) => {
    setFormData(prev => ({ ...prev, organization_id: orgId, department_id: '' }))
    loadDepartments(orgId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.organization_id) throw new Error('Vui lòng chọn Công ty / Chi nhánh')
      if (!formData.department_id) throw new Error('Vui lòng chọn Bộ phận / Phòng ban. Nếu chưa có, hãy tạo trong mục Tổ chức.')

      const { error: insertError } = await supabase
        .from('teams')
        .insert([{
          organization_id: formData.organization_id,
          department_id: formData.department_id,
          name: formData.name,
          description: formData.description
        }])

      if (insertError) throw insertError

      setFormData({ name: '', description: '', organization_id: '', department_id: '' })
      onOpenChange(false)
      onTeamCreated?.()
    } catch (err: any) {
      setError(err.message || 'Tạo nhóm thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Tạo Nhóm mới</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-slate-100 rounded">
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
              Bộ phận / Phòng ban *
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Chọn phòng ban...</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Tên Nhóm *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên nhóm"
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
              placeholder="Nhập mô tả"
              rows={3}
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
              disabled={isLoading || !formData.name || !formData.organization_id || !formData.department_id}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-slate-400"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
