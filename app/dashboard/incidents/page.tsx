'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOrganization } from '@/components/providers/organization-provider'
import { IncidentsHeader } from '@/components/incidents/IncidentsHeader'
import { IncidentsStats } from '@/components/incidents/IncidentsStats'
import { IncidentsTable } from '@/components/incidents/IncidentsTable'
import { IncidentSlideOver } from '@/components/incidents/IncidentSlideOver'
import { ImprovementSlideOver } from '@/components/improvements/ImprovementSlideOver'
import { IncidentsBottomWidgets } from '@/components/incidents/IncidentsBottomWidgets'
import { IncidentsStaffStats } from '@/components/incidents/IncidentsStaffStats'
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog'
import { ImprovementsTable } from '@/components/improvements/ImprovementsTable'
import { ImprovementsStats } from '@/components/improvements/ImprovementsStats'
import { CreateImprovementDialog } from '@/components/improvements/CreateImprovementDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { deleteIncident, deleteImprovement } from '@/app/actions/incident-actions'
import { customAlert, customConfirm } from '@/utils/alert'
import { parseToVietnamDate } from '@/lib/utils'

function IncidentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'improvements' ? 'improvements' : 'incidents'
  const [incidents, setIncidents] = useState<any[]>([])
  const [improvements, setImprovements] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'incidents' | 'improvements'>(initialTab)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'improvements' || tab === 'incidents') {
      setActiveTab(tab)
    }
  }, [searchParams])
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
          const [projectsRes, membersRes, incidentsRes, improvementsRes, apecEmpRes, apecTasksRes, apecProjectsRes] = await Promise.all([
             supabase.from('projects').select('id, name, apec_id, organization_id').in('organization_id', orgIds).is('deleted_at', null).order('name'),
             supabase.from('organization_members').select('user_id, profiles(full_name)').in('organization_id', orgIds).is('deleted_at', null),
             supabase.from('incidents').select('*, projects(name), departments(name)').in('organization_id', orgIds).is('deleted_at', null).order('created_at', { ascending: false }),
             supabase.from('improvements').select('*, projects(name), departments(name)').in('organization_id', orgIds).is('deleted_at', null).order('created_at', { ascending: false }),
             fetch('/api/v1/apec-global/employees?limit=2000').then(r => r.json()).catch(() => ({ items: [] })),
             fetch('/api/v1/apec-global/tasks?limit=2000').then(r => r.json()).catch(() => ({ items: [] })),
             fetch('/api/v1/apec-global/projects?limit=2000').then(r => r.json()).catch(() => ({ items: [] }))
          ])
          
          setAllProjects(projectsRes.data || [])

          let membersList: any[] = []
          const uniqueMembers = new Map();
          
          if (membersRes.data) {
            membersRes.data.forEach((m: any) => {
              if (m.user_id && m.profiles?.full_name) {
                const uId = String(m.user_id);
                if (!uniqueMembers.has(uId)) {
                  uniqueMembers.set(uId, {
                    id: uId,
                    raw_id: m.user_id,
                    full_name: m.profiles.full_name,
                    department_id: null,
                    department_name: ''
                  });
                }
              }
            });
          }

          if (user) {
            const uId = String(user.id);
            if (!uniqueMembers.has(uId)) {
              uniqueMembers.set(uId, {
                id: uId,
                raw_id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tôi',
                department_id: null,
                department_name: ''
              });
            }
          }

          if (apecEmpRes.items) {
            apecEmpRes.items.forEach((e: any) => {
              const empId = String(e.id);
              const fullName = e.fullname || e.name || e.email || 'Chưa rõ';
              if (!uniqueMembers.has(empId)) {
                uniqueMembers.set(empId, {
                  id: empId,
                  raw_id: e.id,
                  full_name: fullName,
                  department_id: e.department?.id || e.department_id || null,
                  department_name: e.department?.name || e.department_name || e.dept_name || ''
                });
              }
            });
          }

          membersList = Array.from(uniqueMembers.values());
          setMembers(membersList);
          
          const apecProjectsMap = (apecProjectsRes?.items || []).reduce((map: any, p: any) => {
            map[String(p.id)] = p.name || p.project_name || ''
            return map
          }, {})

          await Promise.all([
            loadIncidents(orgIds, membersList, incidentsRes.data || [], apecTasksRes, apecProjectsMap),
            loadImprovements(orgIds, membersList, improvementsRes.data || [], apecTasksRes, apecProjectsMap)
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

  const findStaffMember = (idVal: any, currentMembers: any[]) => {
    if (!idVal) return undefined;
    const strId = String(idVal);
    const cleanId = strId.replace('apec_', '');
    return currentMembers.find(m => 
      String(m.id) === strId || 
      String(m.id) === cleanId || 
      String(m.raw_id) === cleanId ||
      String(m.id).replace('apec_', '') === cleanId
    );
  };

  const loadIncidents = async (orgIds: string[], currentMembers: any[], preFetchedData?: any[], apecTasksRes?: any, apecProjects?: any) => {
    try {
      let incidentsData = preFetchedData;
      
      if (!incidentsData) {
        const { data, error } = await supabase
          .from('incidents')
          .select('*, projects(name), departments(name)')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        incidentsData = data || []
      }

      // Also load APEC tasks that are incidents (type = SỰ CỐ & RỦI RO)
      let apecIncidents: any[] = []
      try {
        if (!apecTasksRes) {
           apecTasksRes = await fetch('/api/v1/apec-global/tasks?limit=2000').then(r => r.json()).catch(() => ({ items: [] }))
        }
        if (!apecProjects) {
           const apecProjectsRes = await fetch('/api/v1/apec-global/projects?limit=2000').then(r => r.json()).catch(() => ({ items: [] }))
           apecProjects = (apecProjectsRes.items || []).reduce((map: any, p: any) => {
             map[String(p.id)] = p.name || p.project_name || ''
             return map
           }, {})
        }

        const apecTaskList: any[] = (apecTasksRes.items || []).filter((t: any) => {
          const typeName = String(t.type?.name || t.type_name || '').toUpperCase()
          return typeName.includes('SỰ CỐ') || typeName.includes('RỦI RO')
        })

        // Map APEC status_id → incident status (thống nhất với trạng thái Task)
        const mapApecStatus = (statusId: any, t: any): string => {
          const taskProc = Number(t.process ?? t.progress ?? 0);
          const statusName = String(t.status?.name || t.status || '').toLowerCase();
          const id = Number(statusId || t.status?.id || t.task_status?.id || t.status);
          
          if (id === 4 || t.is_completed || t.status === 'done' || statusName.includes('hoàn thành') || statusName.includes('đã duyệt')) return 'resolved';
          if (id === 3 || t.status === 'review' || statusName.includes('chờ duyệt') || taskProc >= 100) return 'review';
          if (id === 2 || taskProc > 0 || t.status === 'in_progress' || statusName.includes('đang')) return 'investigating';
          return 'new';
        };
        // Map APEC priority_id → severity
        const mapApecPriority = (priorityId: any): string => {
          const id = Number(priorityId)
          if (id >= 5) return 'critical'
          if (id === 4) return 'high'
          if (id <= 2) return 'low'
          return 'medium'
        }

        // IDs đã có trong Supabase incidents (tránh duplicate)
        const existingIds = new Set([
          ...incidentsData.map((i: any) => String(i.id)),
          ...incidentsData.map((i: any) => String(i.checklist_item_id || '')).filter(Boolean)
        ])

        apecIncidents = apecTaskList
          .filter((t: any) => !existingIds.has(String(t.id)))
          .map((t: any) => {
            const statusId = t.status?.id || t.task_status?.id || t.status
            const priorityId = t.priority?.id || t.priority
            const projectId = t.project?.id || t.project_id
            const projectName = t.project?.name || apecProjects[String(projectId)] || 'Chưa xác định'
            const assigneeEmpId = t.employee_assignments?.[0]?.employee?.id || t.assignee?.id || null
            const reporterEmpId = t.reporter_id || t.created_by || t.user_id || t.reporter?.id || t.creator_id || null
            return {
              id: String(t.id),
              title: t.name || t.title || '',
              description: t.description || '',
              module: t.type?.name || 'Hệ thống',
              severity: mapApecPriority(priorityId),
              status: mapApecStatus(statusId, t),
              created_at: t.created_at || t.date_start || t.start_date || '',
              reported_by: reporterEmpId ? String(reporterEmpId) : null,
              assigned_to: assigneeEmpId ? String(assigneeEmpId) : null,
              project_id: projectId ? String(projectId) : null,
              project_name: projectName,
              projects: { name: projectName },
              departments: t.department?.name || t.department_name ? { name: t.department?.name || t.department_name } : null,
              checklist_item_id: String(t.id),
              organization_id: null,
              _from_apec: true,
            }
          })
        const apecTaskMap = new Map((apecTasksRes.items || []).map((t: any) => [String(t.id), t]))
        
        // Merge: Supabase incidents + APEC incidents
        const merged = [
          ...incidentsData.map((inc: any) => {
            let currentStatus = inc.status
            if (apecTasksRes.items) {
              const cleanIncId = String(inc.checklist_item_id || inc.id || '').replace(/^apec_/, '').replace(/^inc_/, '').replace(/^imp_/, '');
              const apecTask = (apecTasksRes.items as any[]).find((t: any) => {
                const cleanTaskId = String(t.id || '').replace(/^apec_/, '');
                return cleanTaskId === cleanIncId ||
                       (t.name && inc.title && t.name.trim().toLowerCase() === inc.title.trim().toLowerCase()) ||
                       (t.title && inc.title && t.title.trim().toLowerCase() === inc.title.trim().toLowerCase());
              });
              if (apecTask) {
                const statusId = apecTask.status?.id || apecTask.task_status?.id || apecTask.status_id || apecTask.task_status_id || apecTask.status
                const mappedApec = mapApecStatus(statusId, apecTask)
                
                const weight = (s: string) => {
                   if (s === 'resolved' || s === 'closed') return 5;
                   if (s === 'review') return 3;
                   if (s === 'investigating' || s === 'fixing' || s === 'in_progress') return 2;
                   return 1;
                }
                
                // Cập nhật đồng bộ các trường dữ liệu quan trọng 100% từ APEC
                const projectId = apecTask.project?.id || apecTask.project_id
                if (projectId) {
                  inc.project_id = String(projectId)
                  inc.project_name = apecTask.project?.name || apecProjects[String(projectId)] || inc.project_name
                  inc.projects = { name: inc.project_name }
                }
                
                const assigneeEmpId = apecTask.employee_assignments?.[0]?.employee?.id || apecTask.assignee?.id
                if (assigneeEmpId) {
                  inc.assigned_to = String(assigneeEmpId)
                }

                const reporterEmpId = apecTask.reporter_id || apecTask.created_by || apecTask.user_id || apecTask.reporter?.id || apecTask.creator_id
                if (reporterEmpId) {
                  inc.reported_by = String(reporterEmpId)
                }

                const priorityId = apecTask.priority?.id || apecTask.priority
                if (priorityId) {
                  inc.severity = mapApecPriority(priorityId)
                }
                
                // Đồng bộ phòng ban nếu có
                if (apecTask.department?.name || apecTask.department_name) {
                   inc.departments = { name: apecTask.department?.name || apecTask.department_name }
                }

                // Chỉ ưu tiên APEC nếu trạng thái bên APEC cao hơn (ví dụ APEC là hoàn thành nhưng Supabase chưa),
                // hoặc nếu Supabase đang là new. Tránh tình trạng APEC bị delay chưa lên 100% mà kéo lùi trạng thái Supabase.
                if (weight(mappedApec) > weight(currentStatus) || currentStatus === 'new') {
                  currentStatus = mappedApec
                }
              }
            }
            const assignee = currentMembers.find((m: any) => String(m.id) === String(inc.assigned_to));
            const reporterNameFromDesc = inc.description?.match(/\[(?:Người báo cáo|Reporter):\s*([^\]]+)\]/i)?.[1]?.trim();
            const foundReporter = findStaffMember(inc.reported_by, currentMembers) || (inc.reporter_id ? findStaffMember(inc.reporter_id, currentMembers) : undefined);
            const reporter = reporterNameFromDesc 
              ? { id: String(inc.reported_by || ''), full_name: reporterNameFromDesc }
              : (foundReporter || (inc.reporter_name ? { id: String(inc.reported_by || ''), full_name: inc.reporter_name } : undefined));

            return {
              ...inc,
              status: currentStatus,
              project_name: inc.project_name || inc.projects?.name || null,
              reporter: reporter,
              reporter_name: reporter?.full_name || reporterNameFromDesc || inc.reporter_name,
              assignee: assignee,
              departments: inc.departments || (assignee?.department_name ? { name: assignee.department_name } : null)
            }
          }),
          ...apecIncidents.map((inc: any) => {
            const assignee = findStaffMember(inc.assigned_to, currentMembers);
            const reporterNameFromDesc = inc.description?.match(/\[(?:Người báo cáo|Reporter):\s*([^\]]+)\]/i)?.[1]?.trim();
            const foundReporter = findStaffMember(inc.reported_by, currentMembers);
            const reporter = reporterNameFromDesc 
              ? { id: String(inc.reported_by || ''), full_name: reporterNameFromDesc }
              : foundReporter;

            return {
              ...inc,
              reporter: reporter,
              reporter_name: reporter?.full_name || reporterNameFromDesc || inc.reporter_name,
              assignee: assignee,
              departments: inc.departments || (assignee?.department_name ? { name: assignee.department_name } : null)
            }
          })
        ]

        // Sort by created_at desc
        merged.sort((a, b) => (parseToVietnamDate(b.created_at)?.getTime() || 0) - (parseToVietnamDate(a.created_at)?.getTime() || 0))

        console.log('[DEBUG_INCIDENTS] merged:', merged.slice(0, 5).map(i => ({ id: i.id, title: i.title, mapped_status: i.status, apec_progress: i.process })));

        setIncidents(merged)
        
        // Calculate stats
        const activeCount = merged.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed').length
        const totalCount = merged.length
         // Tính stats chi tiết sau này
        setStats({ 
          total: totalCount,
          new: merged.filter((i: any) => i.status === 'new').length,
          inProgress: merged.filter((i: any) => i.status === 'investigating' || i.status === 'fixing' || i.status === 'in_progress' || i.status === 'review').length,
          resolved: merged.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length,
          active: activeCount,
          resolveRate: totalCount > 0 ? Math.round((merged.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length / totalCount) * 100) : 0
        })

      } catch (apecErr) {
        console.warn('Lỗi load APEC incidents:', apecErr)
        
        // Fallback: if APEC fails, just render Supabase ones
        const fallbackMerged = incidentsData.map((inc: any) => ({
          ...inc,
          project_name: inc.project_name || inc.projects?.name || null,
          reporter: findStaffMember(inc.reported_by, currentMembers),
          assignee: findStaffMember(inc.assigned_to, currentMembers)
        }))
        setIncidents(fallbackMerged)

        const total = fallbackMerged.length
        const resolvedCount = fallbackMerged.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length
        setStats({
          total,
          new: fallbackMerged.filter((i: any) => i.status === 'new').length,
          inProgress: fallbackMerged.filter((i: any) => i.status === 'investigating' || i.status === 'fixing' || i.status === 'in_progress' || i.status === 'review').length,
          resolved: resolvedCount,
          active: fallbackMerged.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed').length,
          resolveRate: total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
        })
      }
    } catch (err) {
      console.error('Error loading incidents:', err)
    }
  }

  const loadImprovements = async (orgIds: string[], currentMembers: any[], preFetchedData?: any[], apecTasksRes?: any, apecProjects?: any) => {
    try {
      let improvementsData = preFetchedData;

      if (!improvementsData) {
        const { data, error } = await supabase
          .from('improvements')
          .select('*, projects(name), departments(name)')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        improvementsData = data || []
      }
      
      let apecImprovements: any[] = []
      try {
        if (!apecTasksRes) {
           apecTasksRes = await fetch('/api/v1/apec-global/tasks?limit=2000').then(r => r.json()).catch(() => ({ items: [] }))
        }
        if (!apecProjects) {
           const apecProjectsRes = await fetch('/api/v1/apec-global/projects?limit=2000').then(r => r.json()).catch(() => ({ items: [] }))
           apecProjects = (apecProjectsRes.items || []).reduce((map: any, p: any) => {
             map[String(p.id)] = p.name || p.project_name || ''
             return map
           }, {})
        }

        const apecTaskList: any[] = (apecTasksRes.items || []).filter((t: any) => {
          const typeName = String(t.type?.name || t.type_name || '').toUpperCase()
          return typeName.includes('CẢI TIẾN') || typeName.includes('NÂNG CẤP')
        })

        const mapApecStatus = (statusId: any, t: any): string => {
          const taskProc = Number(t.process ?? t.progress ?? 0);
          const statusName = String(t.status?.name || t.status || '').toLowerCase();
          const id = Number(statusId || t.status?.id || t.task_status?.id || t.status);
          
          if (id === 4 || t.is_completed || t.status === 'done' || statusName.includes('hoàn thành') || statusName.includes('đã duyệt')) return 'implemented';
          if (id === 3 || t.status === 'review' || statusName.includes('chờ duyệt') || taskProc >= 100) return 'review';
          if (id === 2 || taskProc > 0 || t.status === 'in_progress' || statusName.includes('đang')) return 'in_progress';
          return 'pending';
        };

        const mapApecPriority = (priorityId: any): string => {
          const id = Number(priorityId)
          if (id >= 4) return 'high'
          if (id <= 2) return 'low'
          return 'medium'
        }

        const existingIds = new Set([
          ...improvementsData.map((i: any) => String(i.id)),
          ...improvementsData.map((i: any) => String(i.checklist_item_id || '')).filter(Boolean)
        ])

        apecImprovements = apecTaskList
          .filter((t: any) => !existingIds.has(String(t.id)))
          .map((t: any) => {
            const statusId = t.status?.id || t.task_status?.id || t.status
            const priorityId = t.priority?.id || t.priority
            const projectId = t.project?.id || t.project_id
            const projectName = t.project?.name || apecProjects[String(projectId)] || 'Chưa xác định'
            const assigneeEmpId = t.employee_assignments?.[0]?.employee?.id || t.assignee?.id || null
            const reporterEmpId = t.reporter_id || t.created_by || t.user_id || t.reporter?.id || t.creator_id || null
            const reporterNameFromDesc = t.description?.match(/\[(?:Người đề xuất|Người báo cáo|Reporter):\s*([^\]]+)\]/i)?.[1]?.trim()
            const foundReporter = findStaffMember(reporterEmpId, currentMembers)

            return {
              id: String(t.id),
              title: t.name || t.title || '',
              description: t.description || '',
              module: t.type?.name || 'Hệ thống',
              impact_level: mapApecPriority(priorityId),
              status: mapApecStatus(statusId, t),
              created_at: t.created_at || t.date_start || t.start_date || '',
              reporter_id: reporterEmpId ? String(reporterEmpId) : null,
              reporter: reporterNameFromDesc ? { id: String(reporterEmpId || ''), full_name: reporterNameFromDesc } : foundReporter,
              reporter_name: reporterNameFromDesc || foundReporter?.full_name,
              assigned_to: assigneeEmpId ? String(assigneeEmpId) : null,
              project_id: projectId ? String(projectId) : null,
              project_name: projectName,
              projects: { name: projectName },
              departments: t.department?.name || t.department_name ? { name: t.department?.name || t.department_name } : null,
              checklist_item_id: String(t.id),
              organization_id: null,
              _from_apec: true,
            }
          })

        const merged = [
          ...improvementsData.map(imp => {
            let currentStatus = imp.status
            if (apecTasksRes.items) {
               const cleanImpId = String(imp.checklist_item_id || imp.id || '').replace(/^apec_/, '').replace(/^inc_/, '').replace(/^imp_/, '');
               const apecTask = (apecTasksRes.items as any[]).find((t: any) => {
                 const cleanTaskId = String(t.id || '').replace(/^apec_/, '');
                 return cleanTaskId === cleanImpId ||
                        (t.name && imp.title && t.name.trim().toLowerCase() === imp.title.trim().toLowerCase()) ||
                        (t.title && imp.title && t.title.trim().toLowerCase() === imp.title.trim().toLowerCase());
               });
               
               if (apecTask) {
                 const statusId = apecTask.status?.id || apecTask.task_status?.id || apecTask.status_id || apecTask.task_status_id || apecTask.status
                 const mappedApec = mapApecStatus(statusId, apecTask)
                 
                 const weight = (s: string) => {
                    if (s === 'implemented' || s === 'done') return 4;
                    if (s === 'review') return 3;
                    if (s === 'in_progress') return 2;
                    return 1;
                 }
                 
                 if (weight(mappedApec) > weight(currentStatus) || currentStatus === 'pending' || currentStatus === 'new') {
                   currentStatus = mappedApec
                 }
                 
                 const projectId = apecTask.project?.id || apecTask.project_id
                 if (projectId) {
                   imp.project_id = String(projectId)
                   imp.project_name = apecTask.project?.name || apecProjects[String(projectId)] || imp.project_name
                   imp.projects = { name: imp.project_name }
                 }
                 
                 const assigneeEmpId = apecTask.employee_assignments?.[0]?.employee?.id || apecTask.assignee?.id
                 if (assigneeEmpId) {
                   imp.assigned_to = String(assigneeEmpId)
                 }

                 const reporterEmpId = apecTask.reporter_id || apecTask.created_by || apecTask.user_id || apecTask.reporter?.id || apecTask.creator_id
                 if (reporterEmpId) {
                   imp.reporter_id = String(reporterEmpId)
                 }

                 if (apecTask.department?.name || apecTask.department_name) {
                   imp.departments = { name: apecTask.department?.name || apecTask.department_name }
                 }
               }
            }
            
            const assignee = currentMembers.find((m: any) => String(m.id) === String(imp.assigned_to));
            const reporterNameFromDesc = imp.description?.match(/\[(?:Người đề xuất|Người báo cáo|Reporter):\s*([^\]]+)\]/i)?.[1]?.trim();
            const foundReporter = findStaffMember(imp.reporter_id, currentMembers) || (imp.reported_by ? findStaffMember(imp.reported_by, currentMembers) : undefined);
            const reporter = reporterNameFromDesc 
              ? { id: String(imp.reporter_id || ''), full_name: reporterNameFromDesc }
              : (foundReporter || (imp.reporter_name ? { id: String(imp.reporter_id || ''), full_name: imp.reporter_name } : undefined));

            return {
              ...imp,
              status: currentStatus,
              project_name: imp.project_name || imp.projects?.name || null,
              departments: imp.departments || (assignee?.department_name ? { name: assignee.department_name } : null),
              reporter: reporter,
              reporter_name: reporter?.full_name || reporterNameFromDesc || imp.reporter_name,
              assignee: assignee
            }
          }),
          ...apecImprovements.map(imp => {
            const assignee = findStaffMember(imp.assigned_to, currentMembers);
            return {
              ...imp,
              assignee: assignee,
              departments: imp.departments || (assignee?.department_name ? { name: assignee.department_name } : null)
            }
          })
        ]

        merged.sort((a, b) => (parseToVietnamDate(b.created_at)?.getTime() || 0) - (parseToVietnamDate(a.created_at)?.getTime() || 0))
        setImprovements(merged)

        // Calculate stats
        const total = merged.length
        const pendingCount = merged.filter((i: any) => i.status === 'pending' || i.status === 'new').length
        const inProgressCount = merged.filter((i: any) => i.status === 'in_progress' || i.status === 'review').length
        const implementedCount = merged.filter((i: any) => i.status === 'implemented' || i.status === 'done' || i.status === 'approved').length

        setImpStats({
          total,
          pending: pendingCount,
          inProgress: inProgressCount,
          implemented: implementedCount,
          implementRate: total > 0 ? Math.round((implementedCount / total) * 100) : 0,
        })
      } catch (apecErr) {
        console.warn('Lỗi load APEC improvements:', apecErr)
      }
    } catch (err) {
      console.error('Error loading improvements:', err)
    }
  }

  const handleIncidentUpdate = async (id: string, field: string, value: any) => {
    try {
      // Tìm incident hiện tại để lấy checklist_item_id
      const currentIncident = incidents.find(inc => inc.id === id)

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

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

      if (isUuid && !currentIncident?._from_apec) {
        const isValidUuid = (val: any) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
        let updateValue = value
        if ((field === 'assigned_to' || field === 'reported_by' || field === 'department_id') && value && !isValidUuid(value)) {
          updateValue = null
        }
        
        const { error } = await supabase
          .from('incidents')
          .update({ [field]: updateValue || null })
          .eq('id', id)

        if (error) {
          // Revert on error by reloading
          if (organizationId) loadIncidents([organizationId], members)
          throw error
        }
      } else {
        // Sự cố thuộc APEC Global
        try {
          const syncId = currentIncident?.checklist_item_id || id
          const payload: any = {
            id: String(syncId).replace(/^apec_/, ''),
            title: currentIncident?.title || '',
          }
          if (field === 'status') {
            const isCompleted = value === 'resolved' || value === 'closed'
            payload.status = value
            payload.is_completed = isCompleted
            payload.process = isCompleted ? 100 : (value === 'investigating' || value === 'fixing' ? 50 : 0)
            payload.progress = payload.process
          } else if (field === 'assigned_to') {
            payload.assignee_id = String(value).replace(/^apec_/, '')
          }
          await fetch('/api/v1/apec-global/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        } catch (apecErr) {
          console.warn('Lỗi đồng bộ sự cố APEC GLOBAL:', apecErr)
        }
      }

      // === ĐỒNG BỘ TRẠNG THÁI SANG CHECKLIST_ITEMS + APEC GLOBAL ===
      if (field === 'status' && currentIncident) {
        // Mapping trạng thái incident → checklist_item
        const newItemStatus = (value === 'resolved' || value === 'closed') ? 'done' 
          : (value === 'review') ? 'review'
          : (value === 'investigating' || value === 'fixing' || value === 'in_progress') ? 'in_progress' 
          : 'todo'
        const newProgress = newItemStatus === 'done' ? 100 : (newItemStatus === 'in_progress' ? 50 : 0)
        const isCompleted = newItemStatus === 'done'

        // 1. Đồng bộ sang checklist_items (nếu có liên kết)
        if (currentIncident.checklist_item_id && isUuid) {
          await supabase.from('checklist_items').update({
            status: newItemStatus,
            progress: newProgress,
            is_completed: isCompleted,
            updated_at: new Date().toISOString()
          }).eq('id', currentIncident.checklist_item_id)
        }

        // 2. Đồng bộ sang APEC Global nếu chưa đồng bộ ở trên
        if (isUuid && !currentIncident._from_apec) {
          try {
            const syncId = currentIncident.checklist_item_id || id
            await fetch('/api/v1/apec-global/tasks', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: String(syncId).replace(/^apec_/, ''),
                title: currentIncident.title,
                status: value,
                is_completed: isCompleted,
                process: newProgress,
                progress: newProgress
              })
            })
          } catch (apecErr) {
            console.warn('Lỗi đồng bộ trạng thái sự cố lên APEC GLOBAL:', apecErr)
          }
        }
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

  const normalizeStatus = (s: string): string => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'new' || str === 'todo' || str === 'pending' || str.includes('chưa')) return 'new'
    if (str === '2' || str === 'investigating' || str === 'fixing' || str === 'in_progress' || str === 'evaluating' || str.includes('đang')) return 'in_progress'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'review'
    if (str === '4' || str === 'resolved' || str === 'done' || str === 'completed' || str === 'implemented' || str === 'approved' || str.includes('hoàn thành')) return 'done'
    if (str === '5' || str === 'closed' || str === 'rejected' || str.includes('đóng')) return 'closed'
    return 'new'
  }

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase()) || i.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const normalized = normalizeStatus(i.status)
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' 
        ? (normalized === 'in_progress' || normalized === 'review')
        : normalized === statusFilter;
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
    const matchesProject = projectFilter === 'all' || i.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesProject;
  });

  const filteredImprovements = improvements.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const normalized = normalizeStatus(i.status)
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active'
        ? (normalized === 'in_progress' || normalized === 'review')
        : normalized === statusFilter;
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
          <IncidentsStaffStats incidents={incidents} type="incidents" />
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
          <IncidentsStaffStats incidents={improvements} type="improvements" />
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

export default function IncidentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600">Đang tải dữ liệu sự cố & cải tiến...</p>
        </div>
      </div>
    }>
      <IncidentsPageContent />
    </Suspense>
  )
}
