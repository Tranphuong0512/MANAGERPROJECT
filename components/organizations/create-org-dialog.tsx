'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { generateUUID } from '@/lib/utils'
import { X } from 'lucide-react'

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrgCreated?: (orgId: string) => void
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  onOrgCreated,
}: CreateOrgDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Chưa đăng nhập')

      // Get owner role id
      const { data: ownerRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', 'owner')
        .single()

      if (!ownerRole) throw new Error('Không tìm thấy quyền Owner')

      // Insert organization
      const slug = `org-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      const orgId = generateUUID()
      
      const { error: insertError } = await supabase
        .from('organizations')
        .insert({
            id: orgId,
            name: formData.name,
            description: formData.description,
            slug
        } as any)

      if (insertError) throw insertError

      // Assign user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role_id: ownerRole.id
        } as any)

      if (memberError) {
        console.error('Member insert error:', memberError)
        throw new Error('Tạo công ty thành công nhưng không thể gán quyền. Vui lòng liên hệ Admin. Lỗi: ' + memberError.message)
      }

      setFormData({ name: '', description: '' })
      onOpenChange(false)
      onOrgCreated?.(orgId)
    } catch (err: any) {
      setError(err.message || 'Tạo công ty thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Tạo Công ty / Chi nhánh mới</h2>
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
              Tên Công ty / Chi nhánh *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên tổ chức"
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
              disabled={isLoading || !formData.name}
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
