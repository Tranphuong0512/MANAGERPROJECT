'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/components/providers/organization-provider'
import { IncidentsHeader } from '@/components/incidents/IncidentsHeader'
import { IncidentsStats } from '@/components/incidents/IncidentsStats'
import { IncidentsTable } from '@/components/incidents/IncidentsTable'
import { IncidentSlideOver } from '@/components/incidents/IncidentSlideOver'
import { ImprovementSlideOver } from '@/components/improvements/ImprovementSlideOver'
import { IncidentsBottomWidgets } from '@/components/incidents/IncidentsBottomWidgets'
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog'
import { ImprovementsTable } from '@/components/improvements/ImprovementsTable'
import { ImprovementsStats } from '@/components/improvements/ImprovementsStats'
import { CreateImprovementDialog } from '@/components/improvements/CreateImprovementDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { deleteIncident, deleteImprovement } from '@/app/actions/incident-actions'
import { customAlert, customConfirm } from '@/utils/alert'

export default function IncidentsPage() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<any[]>([])
  const [improvements, setImprovements] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'incidents' | 'improvements'>('incidents')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  const [selectedImprovement, setSelectedImprovement] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState('')
  const [stats, setStats] = useState<any>({})
  const [impStats, setImpStats] = useState<any>({})
  const [members, setMembers] = useState<any[]>([])
  const [allProjects, setAllProjects] = useState<any[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')

  const handleTabChange = (tab: 'incidents' | 'improvements') => {
    setActiveTab(tab)
    setStatusFilter('active')
    setSeverityFilter('all')
    setSearchQuery('')
  }

  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (isLoadingOrg) return

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        if (activeOrganization) {
          setOrganizationId(activeOrganization.id)
          const orgIds = [activeOrganization.id]
          
          // Parallel Fetching to prevent Waterfall
          const [projectsRes, membersRes, incidentsRes, improvementsRes] = await Promise.all([
             supabase.from('projects').select('id, name, organization_id').in('organization_id', orgIds).is('deleted_at', null).order('name'),
             supabase.from('organization_members').select('user_id, profiles(full_name)').in('organization_id', orgIds).is('deleted_at', null),
             supabase.from('incidents').select('*, projects(name)').in('organization_id', orgIds).is('deleted_at', null).order('created_at', { ascending: false }),
             supabase.from('improvements').select('*, projects(name)').in('organization_id', orgIds).is('deleted_at', null).order('created_at', { ascending: false })
          ])
          
          setAllProjects(projectsRes.data || [])

          let membersList: any[] = []
          if (membersRes.data) {
            const uniqueMembers = new Map();
            membersRes.data.forEach(m => {
              const profile = m.profiles as any;
              const fullName = profile?.full_name || profile?.[0]?.full_name || 'Chưa rõ';
              
              if (m.user_id && !uniqueMembers.has(m.user_id)) {
                uniqueMembers.set(m.user_id, {
                  id: m.user_id,
                  full_name: fullName
                });
              } else if (m.user_id && fullName !== 'Chưa rõ' && uniqueMembers.get(m.user_id).full_name === 'Chưa rõ') {
                uniqueMembers.set(m.user_id, {
                  id: m.user_id,
                  full_name: fullName
                });
              }
            });
            membersList = Array.from(uniqueMembers.values());
            setMembers(membersList);
          }
          
          await Promise.all([
            loadIncidents(orgIds, membersList, incidentsRes.data || []),
            loadImprovements(orgIds, membersList, improvementsRes.data || [])
          ])

        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, activeOrganization, isLoadingOrg])

  const loadIncidents = async (orgIds: string[], currentMembers: any[], preFetchedData?: any[]) => {
    try {
      let incidentsData = preFetchedData;
      
      if (!incidentsData) {
        const { data, error } = await supabase
          .from('incidents')
          .select('*, projects(name)')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        incidentsData = data || []
      }

      setIncidents(incidentsData.map(inc => ({
        ...inc,
        reporter: currentMembers.find(m => m.id === inc.reported_by),
        assignee: currentMembers.find(m => m.id === inc.assigned_to)
      })))

      // Calculate stats
      const total = incidentsData.length
      const newCount = incidentsData.filter(i => i.status === 'new').length
      const inProgressCount = incidentsData.filter(i => i.status === 'investigating' || i.status === 'fixing').length
      const resolvedCount = incidentsData.filter(i => i.status === 'resolved' || i.status === 'closed').length

      setStats({
        total,
        new: newCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        resolveRate: total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
      })
    } catch (err) {
      console.error('Error loading incidents:', err)
    }
  }

  const loadImprovements = async (orgIds: string[], currentMembers: any[], preFetchedData?: any[]) => {
    try {
      let improvementsData = preFetchedData;

      if (!improvementsData) {
        const { data, error } = await supabase
          .from('improvements')
          .select('*, projects(name)')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        improvementsData = data || []
      }
      
      setImprovements(improvementsData.map(imp => ({
        ...imp,
        reporter: currentMembers.find(m => m.id === imp.reporter_id),
        assignee: currentMembers.find(m => m.id === imp.assigned_to)
      })))

      // Calculate stats
      const total = improvementsData.length
      const pendingCount = improvementsData.filter(i => i.status === 'pending').length
      const inProgressCount = improvementsData.filter(i => i.status === 'in_progress').length
      const implementedCount = improvementsData.filter(i => i.status === 'implemented').length

      setImpStats({
        total,
        pending: pendingCount,
        inProgress: inProgressCount,
        implemented: implementedCount,
        implementRate: total > 0 ? Math.round((implementedCount / total) * 100) : 0,
      })
    } catch (err) {
      console.error('Error loading improvements:', err)
    }
  }

  const handleIncidentUpdate = async (id: string, field: string, value: any) => {
    try {
      // Optimistic update
      setIncidents(prev => prev.map(inc => {
        if (inc.id === id) {
          const updated = { ...inc, [field]: value }
          if (field === 'assigned_to') {
            const member = members.find(m => m.id === value)
            updated.assignee = member ? { full_name: member.full_name } : undefined
          }
          return updated
        }
        return inc
      }))

      const { error } = await supabase
        .from('incidents')
        .update({ [field]: value || null })
        .eq('id', id)

      if (error) {
        // Revert on error by reloading
        if (organizationId) loadIncidents([organizationId], members)
        throw error
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật sự cố:', err)
    }
  }

  const handleImprovementUpdate = async (id: string, field: string, value: any) => {
    try {
      // Optimistic update
      setImprovements(prev => prev.map(imp => {
        if (imp.id === id) {
          const updated = { ...imp, [field]: value }
          if (field === 'assigned_to') {
            const member = members.find(m => m.id === value)
            updated.assignee = member ? { full_name: member.full_name } : undefined
          }
          return updated
        }
        return imp
      }))

      const { error } = await supabase
        .from('improvements')
        .update({ [field]: value || null })
        .eq('id', id)

      if (error) {
        // Revert on error
        if (organizationId) loadImprovements([organizationId], members)
        throw error
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật cải tiến:', err)
    }
  }

  const handleDeleteIncident = async (id: string) => {
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa sự cố này không? Hành động này không thể hoàn tác.'))) return;
    const res = await deleteIncident(id);
    if (res.success) {
      if (selectedIncident?.id === id) setSelectedIncident(null);
      if (organizationId) loadIncidents([organizationId], members);
    } else {
      await customAlert('Không thể xóa sự cố: ' + res.error);
    }
  }

  const handleDeleteImprovement = async (id: string) => {
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa cải tiến này không? Hành động này không thể hoàn tác.'))) return;
    const res = await deleteImprovement(id);
    if (res.success) {
      if (selectedImprovement?.id === id) setSelectedImprovement(null);
      if (organizationId) loadImprovements([organizationId], members);
    } else {
      await customAlert('Không thể xóa cải tiến: ' + res.error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải sự cố...</div>
        </div>
      </div>
    )
  }

  const uniqueProjects = allProjects;

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase()) || i.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' 
        ? (i.status !== 'resolved' && i.status !== 'closed') 
        : i.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || i.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesProject;
  });

  const filteredImprovements = improvements.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active'
        ? (i.status !== 'implemented' && i.status !== 'rejected')
        : i.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || i.impact_level === severityFilter;
    const matchesProject = projectFilter === 'all' || i.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesProject;
  });

  return (
    <div className="pb-10 font-sans relative">
      <IncidentsHeader 
        onCreateClick={() => setShowCreateDialog(true)} 
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        projects={uniqueProjects}
        canCreate={activeTab === 'incidents' ? hasPermission('create_incidents') : hasPermission('create_improvements')}
      />
      
      {activeTab === 'incidents' ? (
        <>
          <IncidentsStats stats={stats} />
          <IncidentsTable 
            incidents={filteredIncidents} 
            members={members}
            onIncidentClick={setSelectedIncident}
            onIncidentUpdate={handleIncidentUpdate}
            onDelete={hasPermission('delete_incidents') ? handleDeleteIncident : undefined}
            canView={hasPermission('view_incidents')}
            canEdit={hasPermission('edit_incidents')}
          />
        </>
      ) : (
        <>
          <ImprovementsStats stats={impStats} />
          <ImprovementsTable 
            improvements={filteredImprovements}
            members={members}
            onImprovementClick={setSelectedImprovement}
            onImprovementUpdate={handleImprovementUpdate}
            onDelete={hasPermission('delete_improvements') ? handleDeleteImprovement : undefined}
            canView={hasPermission('view_improvements')}
            canEdit={hasPermission('edit_improvements')}
          />
        </>
      )}

      <IncidentsBottomWidgets incidents={incidents} />

      <IncidentSlideOver 
        incident={selectedIncident} 
        members={members}
        onClose={() => {
          setSelectedIncident(null)
          if (organizationId) loadIncidents([organizationId], members)
        }} 
        canEdit={hasPermission('edit_incidents')}
      />

      <ImprovementSlideOver 
        improvement={selectedImprovement} 
        members={members}
        onClose={() => {
          setSelectedImprovement(null)
          if (organizationId) loadImprovements([organizationId], members)
        }}
        canEdit={hasPermission('edit_improvements')}
      />

      {activeTab === 'incidents' ? (
        <CreateIncidentDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organizationId}
          onIncidentCreated={() => loadIncidents([organizationId], members)}
          projects={allProjects}
          members={members}
        />
      ) : (
        <CreateImprovementDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organizationId}
          onSaved={() => loadImprovements([organizationId], members)}
          projects={allProjects}
          members={members}
        />
      )}
    </div>
  )
}
