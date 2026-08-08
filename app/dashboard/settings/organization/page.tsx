'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ExportDataButton } from '@/components/settings/ExportDataButton'
import { Plus, Trash2, Save } from 'lucide-react'
import { customAlert, customConfirm } from '@/utils/alert'

interface Member {
  id: string
  user_id: string
  role_id: string
  profiles: {
    full_name?: string
    avatar_url?: string
  }
  user_roles: {
    name: string
  }
}

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
}

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get user's organization and roles in parallel
        const orgDataPromise = supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single();

        const rolesPromise = supabase
          .from('user_roles')
          .select('*')
          .order('name');
          
        const [orgResult, rolesResult] = await Promise.all([orgDataPromise, rolesPromise]);
        
        const orgData = orgResult.data;
        const rolesData = rolesResult.data;

        if (!orgData) {
          return
        }

        setRoles(rolesData || [])

        // Load organization and members in parallel
        const organizationPromise = supabase
          .from('organizations')
          .select('*')
          .eq('id', orgData.organization_id)
          .is('deleted_at', null)
          .single();

        const membersPromise = supabase
          .from('organization_members')
          .select(`
            *,
            user_roles (name),
            profiles (full_name, avatar_url)
          `)
          .eq('organization_id', orgData.organization_id)
          .is('deleted_at', null)
          .order('joined_at', { ascending: false });

        const [orgResponse, membersResponse] = await Promise.all([organizationPromise, membersPromise]);

        const organization = orgResponse.data;
        const membersData = membersResponse.data;

        setOrg(organization)
        setFormData({
          name: organization?.name || '',
          slug: organization?.slug || '',
          description: organization?.description || '',
        })

        setMembers(membersData || [])
        if (rolesData && rolesData.length > 0) {
          setSelectedRole(rolesData[1].id) // Default to manager
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleSaveOrg = async () => {
    if (!org) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          description: formData.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org.id)

      if (error) throw error
      await customAlert('Organization updated successfully')
    } catch (err: any) {
      await customAlert('Failed to save organization: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!(await customConfirm('Remove this member from the organization?'))) return

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      setMembers(members.filter(m => m.id !== memberId))
    } catch (err: any) {
      await customAlert('Failed to remove member: ' + err.message)
    }
  }

  const handleInviteMember = async () => {
    if (!org || !inviteEmail || !selectedRole) {
      await customAlert('Please fill all fields')
      return
    }

    try {
      const response = await fetch(`/api/v1/organizations/${org.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role_id: selectedRole,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to invite member')
      }

      await customAlert('Member invited successfully')
      setInviteEmail('')
      setShowInviteDialog(false)

      // Reload members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select(`
          *,
          user_roles (name),
          profiles (full_name, avatar_url)
        `)
        .eq('organization_id', org.id)
        .is('deleted_at', null)

      setMembers(membersData || [])
    } catch (err: any) {
      await customAlert('Error: ' + err.message)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Đang tải...</div>
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Cài đặt Tổ chức</h1>
        {org && (
          <ExportDataButton orgId={org.id} filename={`${org.slug}_backup`} />
        )}
      </div>

      {/* Organization Info */}
      {org && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Thông tin Tổ chức</h2>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Tên Tổ chức</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              disabled
              className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Slug không thể thay đổi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <button
            onClick={handleSaveOrg}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-slate-400"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Thành viên</h2>
          <button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Mời thành viên
          </button>
        </div>

        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tên</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Vai trò</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {members.map(member => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 text-slate-900">{member.profiles?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{member.user_roles?.name || 'member'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">-</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-600">Chưa có thành viên</p>
        )}
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Mời thành viên</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Vai trò</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteDialog(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
