'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Users } from 'lucide-react'
import { CreateTeamDialog } from '@/components/teams/create-team-dialog'
import { customAlert, customConfirm } from '@/utils/alert'

interface TeamMember {
  id: string
  full_name?: string
  email?: string
  role?: string
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>('')

  const loadTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          organizations (*)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (orgMembers && orgMembers.length > 0) {
        const orgs = orgMembers.map(om => om.organizations)
        setOrganizations(orgs)
        
        const orgId = selectedOrg || (orgs[0] as any).id
        if (!selectedOrg) setSelectedOrg(orgId)

        const { data: teamsData } = await supabase
          .from('teams')
          .select(`
            *,
            departments (name)
          `)
          .eq('organization_id', orgId)
          .is('deleted_at', null)

        setTeams(teamsData || [])
      }
    } catch (err) {
      console.error('Error loading teams:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [router, selectedOrg])

  const handleDeleteTeam = async (id: string) => {
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa nhóm này?'))) return
    try {
      await supabase.from('teams').delete().eq('id', id)
      setTeams(teams.filter(t => t.id !== id))
    } catch (err) {
      console.error('Error deleting team:', err)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Đang tải danh sách nhóm...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Nhóm</h1>
        <button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-5 h-5" />
          Nhóm mới
        </button>
      </div>

      {organizations.length > 0 && (
        <div className="flex gap-4">
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                </div>
                <button onClick={() => handleDeleteTeam(team.id)} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <div className="text-xs text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded mb-3">
                Phòng ban: {team.departments?.name}
              </div>
              {team.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{team.description}</p>
              )}
              <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  Ngày tạo: {new Date(team.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg p-12 text-center">
          <p className="text-slate-600 mb-4">Chưa có nhóm nào</p>
          <button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Tạo nhóm đầu tiên của bạn
          </button>
        </div>
      )}

      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTeamCreated={loadTeams}
      />
    </div>
  )
}
