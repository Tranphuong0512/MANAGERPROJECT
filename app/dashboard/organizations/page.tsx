'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Building2, Users, Trash2, FolderKanban, ClipboardList, AlertTriangle, ChevronDown, ChevronRight, Network } from 'lucide-react'
import { CreateOrgDialog } from '@/components/organizations/create-org-dialog'
import { CreateDeptDialog } from '@/components/organizations/create-dept-dialog'
import { useOrganization } from '@/components/providers/organization-provider'
import { ExportDataButton } from '@/components/settings/ExportDataButton'
import { usePermissions } from '@/hooks/usePermissions'
import { customAlert, customConfirm } from '@/utils/alert'

interface OrgStats {
  members: number
  departments: number
  projects: number
  tasks: number
  incidents: number
}

export default function OrganizationsPage() {
  const { activeOrganization, organizations, isSuperAdmin, isLoading: isLoadingOrg, setActiveOrganization } = useOrganization()
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [orgStats, setOrgStats] = useState<OrgStats>({ members: 0, departments: 0, projects: 0, tasks: 0, incidents: 0 })
  const [allOrgStats, setAllOrgStats] = useState<Record<string, OrgStats>>({})
  
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateDept, setShowCreateDept] = useState(false)
  const [expandedChart, setExpandedChart] = useState(true)
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (isLoadingOrg) return

    const loadData = async (orgId: string) => {
      setIsLoading(true)
      try {
        // Load departments
        const { data: deptsData } = await supabase
          .from('departments')
          .select('*, teams(count)')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
        setDepartments(deptsData || [])

        // Load stats
        const [membersRes, projectsRes, tasksRes, incidentsRes] = await Promise.all([
          supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null),
          supabase.from('tasks').select('id, projects!inner(organization_id)', { count: 'exact', head: true }).eq('projects.organization_id', orgId).is('deleted_at', null),
          supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        ])

        setOrgStats({
          members: membersRes.count || 0,
          departments: (deptsData || []).length,
          projects: projectsRes.count || 0,
          tasks: tasksRes.count || 0,
          incidents: incidentsRes.count || 0,
        })
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (activeOrganization) {
      loadData(activeOrganization.id)
    } else {
      setDepartments([])
      setIsLoading(false)
    }
  }, [activeOrganization, isLoadingOrg])

  // Load stats for all orgs (super admin)
  useEffect(() => {
    if (!isSuperAdmin || organizations.length === 0) return
    
    const loadAllStats = async () => {
      const statsMap: Record<string, OrgStats> = {}
      for (const org of organizations) {
        const [membersRes, deptsRes, projectsRes] = await Promise.all([
          supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
          supabase.from('departments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
        ])
        statsMap[org.id] = {
          members: membersRes.count || 0,
          departments: deptsRes.count || 0,
          projects: projectsRes.count || 0,
          tasks: 0,
          incidents: 0,
        }
      }
      setAllOrgStats(statsMap)
    }
    loadAllStats()
  }, [isSuperAdmin, organizations])

  const handleDeleteOrg = async (orgId: string) => {
    const orgName = organizations.find(o => o.id === orgId)?.name || 'tổ chức này'
    if (!(await customConfirm(`Bạn có chắc chắn muốn xóa "${orgName}"?\n\nToàn bộ phòng ban, nhóm và thành viên trong tổ chức sẽ bị xóa theo.`))) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/v1/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete organization')
      }

      await customAlert('Xóa tổ chức thành công.')
      window.location.reload()
    } catch (err) {
      console.error('Error deleting organization:', err)
      await customAlert('Xóa tổ chức thất bại.')
    }
  }

  const handleDeleteDept = async (id: string) => {
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa phòng ban này?'))) return
    
    try {
      await supabase.from('departments').delete().eq('id', id)
      setDepartments(departments.filter(d => d.id !== id))
    } catch (err) {
      console.error('Error deleting department:', err)
    }
  }

  if (isLoading || isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Đang tải cấu trúc tổ chức...</span>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Thành viên', value: orgStats.members, icon: Users, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    { label: 'Phòng ban', value: orgStats.departments, icon: Building2, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', iconBg: 'bg-indigo-100' },
    { label: 'Dự án', value: orgStats.projects, icon: FolderKanban, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
    { label: 'Công việc', value: orgStats.tasks, icon: ClipboardList, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
    { label: 'Sự cố', value: orgStats.incidents, icon: AlertTriangle, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-100' },
  ]

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tổ chức</h1>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý cấu trúc, phòng ban và thống kê tổ chức</p>
          </div>
          
          {organizations.length > 0 && (
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block mx-2"></div>
          )}
          
          {organizations.length > 0 && (
            <select
              value={activeOrganization?.id || ''}
              onChange={(e) => {
                const org = organizations.find(o => o.id === e.target.value)
                if (org) {
                  setActiveOrganization(org)
                }
              }}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <ExportDataButton orgId={null} filename="all_organizations_backup" label="Backup Hệ thống" />
          )}
          {hasPermission('create_organization') && (
            <button 
              onClick={() => setShowCreateOrg(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo Tổ chức
            </button>
          )}
        </div>
      </div>

      {/* Super Admin: All Orgs Grid */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded flex items-center justify-center shadow-sm">
              <Building2 className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-800">Quản trị toàn hệ thống</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
            <span className="text-xs text-slate-500 font-medium ml-auto">{organizations.length} tổ chức</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {organizations.map(org => {
              const stats = allOrgStats[org.id] || { members: 0, departments: 0, projects: 0 }
              const isActive = activeOrganization?.id === org.id
              
              return (
                <div 
                  key={org.id} 
                  onClick={() => setActiveOrganization(org)}
                  className={`bg-white rounded-xl p-4 border transition-all cursor-pointer relative overflow-hidden group ${isActive ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">{org.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">ID: {org.id.split('-')[0].toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <div className="text-sm font-bold text-slate-700">{stats.members}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Nhân sự</div>
                    </div>
                    <div className="text-center border-l border-slate-100">
                      <div className="text-sm font-bold text-slate-700">{stats.departments}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Phòng ban</div>
                    </div>
                    <div className="text-center border-l border-slate-100">
                      <div className="text-sm font-bold text-slate-700">{stats.projects}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Dự án</div>
                    </div>
                  </div>
                  
                  {hasPermission('delete_organization') && !isActive && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id); }}
                      className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Xóa tổ chức"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isActive && (
                    <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold py-1 w-16 text-center transform translate-x-4 translate-y-1 rotate-45 shadow-sm">
                        Active
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!activeOrganization ? (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-center justify-between border border-amber-200">
          <span className="text-sm font-medium">Bạn chưa tham gia tổ chức nào. Hãy tạo một tổ chức mới.</span>
          <button 
            onClick={() => setShowCreateOrg(true)}
            className="px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors text-sm font-medium"
          >
            Tạo tổ chức
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-5 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-white/60`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.text}`} />
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${card.text}`}>{card.value}</div>
                    <div className="text-[11px] font-medium text-slate-500 -mt-0.5">{card.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Org Chart - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => setExpandedChart(!expandedChart)}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Network className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Sơ đồ cơ cấu tổ chức</span>
                <span className="text-[11px] text-slate-400 font-medium ml-1">{departments.length} phòng ban</span>
              </div>
              {expandedChart ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            
            {expandedChart && (
              <div className="px-5 pb-6 pt-2 overflow-x-auto">
                <div className="flex flex-col items-center min-w-fit">
                  {/* Root */}
                  <div className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white text-sm font-bold shadow-md flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    {activeOrganization.name}
                  </div>
                  
                  {departments.length > 0 && (
                    <>
                      {/* Vertical line */}
                      <div className="w-px h-5 bg-slate-300"></div>
                      
                      {/* Horizontal connector */}
                      <div className="relative flex items-start">
                        {departments.length > 1 && (
                          <div className="absolute top-0 h-px bg-slate-300" style={{
                            left: `${100 / (2 * departments.length)}%`,
                            right: `${100 / (2 * departments.length)}%`,
                          }}></div>
                        )}
                        
                        <div className="flex gap-3">
                          {departments.map((dept) => (
                            <div key={dept.id} className="flex flex-col items-center group">
                              <div className="w-px h-4 bg-slate-300"></div>
                              <div className="relative px-4 py-2 bg-white border border-slate-200 rounded-lg text-center min-w-[120px] hover:border-indigo-400 hover:shadow-sm transition-all">
                                <div className="text-xs font-semibold text-slate-800 truncate max-w-[100px]">{dept.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{dept.teams?.[0]?.count || 0} nhóm</div>
                                {hasPermission('delete_organization') && (
                                  <button 
                                    onClick={() => handleDeleteDept(dept.id)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-300 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-2.5 h-2.5 text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Add department button */}
                  {hasPermission('create_organization') && (
                    <button 
                      onClick={() => setShowCreateDept(true)}
                      className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm phòng ban
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Departments Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Danh sách Phòng ban</span>
              </div>
              {hasPermission('create_organization') && (
                <button 
                  onClick={() => setShowCreateDept(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo phòng ban
                </button>
              )}
            </div>
            {departments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400 italic">
                Chưa có phòng ban nào được thành lập
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phòng ban</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mô tả</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Nhóm</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-[200px] truncate">{dept.description || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {dept.teams?.[0]?.count || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {hasPermission('delete_organization') && (
                          <button 
                            onClick={() => handleDeleteDept(dept.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}


      <CreateOrgDialog 
        open={showCreateOrg} 
        onOpenChange={setShowCreateOrg} 
        onOrgCreated={() => window.location.reload()} 
      />
      
      {activeOrganization && (
        <CreateDeptDialog 
          open={showCreateDept} 
          onOpenChange={setShowCreateDept} 
          organizationId={activeOrganization.id} 
          onDeptCreated={() => window.location.reload()} 
        />
      )}
    </div>
  )
}
