'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useOrganization } from '@/components/providers/organization-provider'

// Dynamic imports for heavy components - reduces initial bundle size
const MonitorStatsRow = dynamic(() => import('@/components/dashboard/MonitorStatsRow').then(mod => mod.MonitorStatsRow), {
  loading: () => <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6"><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div></div>
})

const MiniKanban = dynamic(() => import('@/components/dashboard/MiniKanban').then(mod => mod.MiniKanban), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const MiniGantt = dynamic(() => import('@/components/dashboard/MiniGantt').then(mod => mod.MiniGantt), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const ScheduleWidget = dynamic(() => import('@/components/dashboard/ScheduleWidget').then(mod => mod.ScheduleWidget), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const MonitoringActivity = dynamic(() => import('@/components/dashboard/MonitoringActivity').then(mod => mod.MonitoringActivity), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const IncidentTrendCharts = dynamic(() => import('@/components/dashboard/IncidentTrendCharts').then(mod => mod.IncidentTrendCharts), {
  ssr: false,
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse col-span-3"></div>
})

const DepartmentTasksOverviewTable = dynamic(() => import('@/components/dashboard/DepartmentTasksOverviewTable').then(mod => mod.DepartmentTasksOverviewTable), {
  loading: () => <div className="h-[400px] bg-white rounded-2xl border border-slate-200 animate-pulse mb-8"></div>
})

export default function DashboardPage() {
  const router = useRouter()
  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [overviewTasks, setOverviewTasks] = useState<any[]>([])

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    overdueProjects: 0,
    planningProjects: 0,
    totalIncidents: 0,
    unresolvedIncidents: 0,
    totalStaff: 0,
    totalImprovements: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    avgProgress: 0,
  })

  useEffect(() => {
    if (isLoadingOrg) return;

    const loadData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        if (!activeOrganization) {
          setError('Chưa có tổ chức nào được chọn. Hãy tạo hoặc tham gia một tổ chức để bắt đầu.')
          setIsLoading(false)
          return
        }

        const orgIds = [activeOrganization.id]

        // Khởi tạo các promise song song cho dữ liệu độc lập
        const projectsPromise = supabase
          .from('projects')
          .select('*')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });

        const incidentsPromise = supabase
          .from('incidents')
          .select('*, projects(name)')
          .or(`organization_id.in.(${orgIds.join(',')}),organization_id.is.null`)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        const staffCountPromise = supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', orgIds)
          .is('deleted_at', null);

        const improvementsCountPromise = supabase
          .from('improvements')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', orgIds);

        const departmentsPromise = supabase
          .from('departments')
          .select('*')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('name');

        // Đợi tất cả fetch độc lập hoàn thành
        const [projectsRes, incidentsRes, staffCountRes, improvementsCountRes, departmentsRes] = await Promise.all([
          projectsPromise,
          incidentsPromise,
          staffCountPromise,
          improvementsCountPromise,
          departmentsPromise
        ]);

        let projectsData = projectsRes.data || [];
        const incidentsData = incidentsRes.data || [];
        const totalStaff = staffCountRes.count || 0;
        const totalImprovements = improvementsCountRes.count || 0;
        const departmentsData = departmentsRes.data || [];

        setDepartments(departmentsData)
        setIncidents(incidentsData)

        const projectIds = projectsData.map(p => p.id)

        let tasksData: any[] = []
        let rawChecklistData: any[] = []
        let activitiesData: any[] = []

        if (projectIds.length > 0) {
          // Fetch Tasks và Activities song song vì phụ thuộc vào projectIds
          const tasksPromise = supabase
            .from('checklist_items')
            .select(`
              id, title, status, is_completed, end_date, start_date, priority, 
              project_checklists!inner(project_id, projects(id, name, department_id, departments(id, name))),
              assignee:staff(id, full_name, avatar_url)
            `)
            .in('project_checklists.project_id', projectIds)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });

          const activitiesPromise = supabase
            .from('project_activities')
            .select('*, projects(name), user:profiles!project_activities_user_id_fkey(full_name, avatar_url)')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
            .limit(10);

          const [tasksResult, activitiesResult] = await Promise.all([tasksPromise, activitiesPromise]);

          if (tasksResult.data) {
            rawChecklistData = tasksResult.data
            tasksData = tasksResult.data.map((t: any) => ({
              id: t.id,
              title: t.title,
              status: t.status || (t.is_completed ? 'done' : 'todo'),
              priority: t.priority || 'medium',
              due_date: t.end_date,
              project_id: t.project_checklists?.project_id,
              projects: { name: t.project_checklists?.projects?.name },
              assignee: t.assignee
            }))
          }

          if (activitiesResult.data) {
            activitiesData = activitiesResult.data
          }
        }

        if (tasksData.length > 0 || projectIds.length > 0) {
          projectsData = projectsData.map(p => {
            const pTasks = tasksData.filter(t => String(t.project_id) === String(p.id))
            const totalTasks = pTasks.length
            const doneTasks = pTasks.filter(t => t.status === 'done').length
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
            return {
              ...p,
              progress_percentage: p.progress_percentage > 0 ? p.progress_percentage : progress
            }
          })
        }

        // Gộp thêm tasks từ APEC Global API & phát hiện Incidents từ APEC
        let apecTasksData: any[] = []
        let apecTasksRawItems: any[] = []
        try {
          const apecTasksRes = await fetch('/api/v1/apec-global/tasks').then(r => r.json()).catch(() => ({ success: false, items: [] }))
          if (apecTasksRes.success && apecTasksRes.items) {
            apecTasksRawItems = apecTasksRes.items || []
            apecTasksData = apecTasksRawItems.map((t: any) => {
              let progressVal = Number(t.progress || t.process) || 0
              const rawStatus = t.status || t.task_status
              let resolvedStatus = 'todo'
              if (progressVal >= 100) {
                resolvedStatus = 'done'
              } else if (rawStatus && typeof rawStatus === 'object') {
                const sId = Number(rawStatus.id)
                if (sId === 4) resolvedStatus = 'done'
                else if (sId === 3) resolvedStatus = 'review'
                else if (sId === 2) resolvedStatus = 'in_progress'
              } else if (typeof rawStatus === 'string') {
                const s = rawStatus.toLowerCase()
                if (s === 'done' || s === 'completed') resolvedStatus = 'done'
                else if (s === 'review') resolvedStatus = 'review'
                else if (s === 'in_progress') resolvedStatus = 'in_progress'
              }
              return { ...t, resolvedStatus }
            })
          }
        } catch (e) {
          console.warn('APEC tasks fetch for dashboard stats:', e)
        }

        // Merge Incidents (Supabase + APEC tasks có type là SỰ CỐ & RỦI RO)
        const apecIncidentTasks = (apecTasksRawItems || []).filter((t: any) => {
          const typeName = String(t.type?.name || t.type_name || '').toUpperCase()
          return typeName.includes('SỰ CỐ') || typeName.includes('RỦI RO')
        })

        const mapApecIncidentStatus = (t: any): string => {
          const taskProc = Number(t.process ?? t.progress ?? 0)
          const statusName = String(t.status?.name || t.status || '').toLowerCase()
          const statusId = Number(t.status?.id || t.task_status?.id || t.status)
          
          if (t.is_completed || t.status === 'done' || taskProc >= 100 || statusName.includes('hoàn thành') || statusName.includes('đã duyệt') || statusId === 4) return 'resolved'
          if (t.status === 'review' || statusName.includes('chờ duyệt') || statusId === 3) return 'review'
          if (t.status === 'in_progress' || statusName.includes('đang thực hiện') || statusId === 2) return 'investigating'
          return 'new'
        }

        const existingIncidentIds = new Set([
          ...incidentsData.map((i: any) => String(i.id)),
          ...incidentsData.map((i: any) => String(i.checklist_item_id || '')).filter(Boolean)
        ])

        const extraApecIncidents = apecIncidentTasks
          .filter((t: any) => !existingIncidentIds.has(String(t.id)))
          .map((t: any) => ({
            id: String(t.id),
            title: t.name || t.title || '',
            status: mapApecIncidentStatus(t),
            created_at: t.created_at || new Date().toISOString(),
            _from_apec: true,
          }))

        const combinedIncidents = [
          ...incidentsData.map((inc: any) => {
            let currentStatus = inc.status
            const apecTask = (apecTasksRawItems || []).find((t: any) => 
              String(t.id) === String(inc.checklist_item_id || inc.id) ||
              `apec_${t.id}` === String(inc.checklist_item_id) ||
              (t.name && inc.title && t.name.trim().toLowerCase() === inc.title.trim().toLowerCase())
            )
            if (apecTask) {
              currentStatus = mapApecIncidentStatus(apecTask)
            }
            return { ...inc, status: currentStatus }
          }),
          ...extraApecIncidents
        ]

        // Tạo danh sách công việc toàn diện cho Bảng Thống Kê & Phê Duyệt Phòng Ban
        const overviewSupabaseTasks = (rawChecklistData || []).map((t: any) => {
          const prj = t.project_checklists?.projects
          const deptName = prj?.departments?.name || prj?.department_name || 'Phòng Dự án'
          const deptId = prj?.department_id || prj?.departments?.id
          const isDone = t.is_completed || t.status === 'done'
          const isReview = t.status === 'review' || t.status === 'in_review'
          const progressVal = isDone ? 100 : isReview ? 100 : (t.status === 'in_progress' ? 50 : 0)

          return {
            id: t.id,
            raw_id: t.id,
            title: t.title,
            project_id: prj?.id || t.project_checklists?.project_id,
            project_name: prj?.name || 'Dự án nội bộ',
            department_id: deptId,
            department_name: deptName,
            assignee: t.assignee ? {
              id: t.assignee.id,
              full_name: t.assignee.full_name,
              avatar_url: t.assignee.avatar_url
            } : undefined,
            start_date: t.start_date,
            due_date: t.end_date,
            progress: progressVal,
            status: (isDone ? 'done' : isReview ? 'review' : (t.status === 'in_progress' ? 'in_progress' : 'todo')) as any,
            priority: (t.priority || 'medium') as any,
            source: 'supabase' as const,
          }
        })

        const overviewApecTasks = (apecTasksRawItems || []).map((t: any) => {
          const progressVal = Number(t.progress ?? t.process ?? 0)
          const rawStatus = t.status || t.task_status
          let resolvedStatus: 'todo' | 'in_progress' | 'review' | 'done' = 'todo'
          
          if (progressVal >= 100 || t.is_completed) {
            resolvedStatus = 'done'
          } else if (rawStatus && typeof rawStatus === 'object') {
            const sId = Number(rawStatus.id)
            if (sId === 4) resolvedStatus = 'done'
            else if (sId === 3) resolvedStatus = 'review'
            else if (sId === 2) resolvedStatus = 'in_progress'
          } else if (typeof rawStatus === 'string') {
            const s = rawStatus.toLowerCase()
            if (s === 'done' || s === 'completed' || s === 'approved') resolvedStatus = 'done'
            else if (s === 'review' || s === 'pending') resolvedStatus = 'review'
            else if (s === 'in_progress' || s === 'doing') resolvedStatus = 'in_progress'
          }

          // Trích xuất phòng ban từ APEC task
          let deptName = t.department?.name || t.department_name
          if (!deptName && Array.isArray(t.employee_assignments) && t.employee_assignments.length > 0) {
            deptName = t.employee_assignments[0]?.employee?.department_name || t.employee_assignments[0]?.department_name
          }
          if (!deptName && t.employee?.department_name) {
            deptName = t.employee.department_name
          }
          if (!deptName) deptName = 'Phòng Nghiệp Vụ'

          // Trích xuất người thực hiện
          let assigneeObj = undefined
          if (t.employee) {
            assigneeObj = {
              id: t.employee.id,
              full_name: t.employee.fullname || t.employee.name,
              avatar_url: t.employee.avatar
            }
          } else if (Array.isArray(t.employee_assignments) && t.employee_assignments.length > 0) {
            const emp = t.employee_assignments[0]?.employee
            if (emp) {
              assigneeObj = {
                id: emp.id,
                full_name: emp.fullname || emp.name,
                avatar_url: emp.avatar
              }
            }
          }

          return {
            id: `apec_${t.id}`,
            raw_id: t.id,
            title: t.name || t.title || 'Nhiệm vụ',
            project_id: t.project_id || t.project?.id,
            project_name: t.project?.name || t.project_name || 'Dự án APEC',
            department_id: t.department_id || t.department?.id,
            department_name: deptName,
            assignee: assigneeObj,
            start_date: t.start_date,
            due_date: t.due_date || t.end_date,
            progress: progressVal,
            status: resolvedStatus,
            priority: (t.priority?.name?.toLowerCase()?.includes('cao') ? 'high' : 'medium') as any,
            source: 'apec' as const,
            employee_assignments: t.employee_assignments || []
          }
        })

        const combinedOverviewTasks = [...overviewSupabaseTasks, ...overviewApecTasks]
        setOverviewTasks(combinedOverviewTasks)

        setProjects(projectsData)
        setTasks(tasksData)
        setActivities(activitiesData)
        setIncidents(combinedIncidents)

        // Tính toán Stats Sự Cố
        const totalInc = combinedIncidents.length
        const unresolvedInc = combinedIncidents.filter((inc: any) =>
          inc.status !== 'resolved' && inc.status !== 'closed' && inc.status !== 'fixed'
        ).length

        // Gộp tasks Supabase + APEC (tránh duplicate)
        const supabaseTaskStatuses = tasksData.map((t: any) => t.status)
        const apecDone = apecTasksData.filter(t => t.resolvedStatus === 'done').length
        const apecInProgress = apecTasksData.filter(t => t.resolvedStatus === 'in_progress' || t.resolvedStatus === 'review').length
        const apecTodo = apecTasksData.filter(t => t.resolvedStatus === 'todo').length
        const supabaseDone = supabaseTaskStatuses.filter((s: string) => s === 'done').length
        const supabaseInProgress = supabaseTaskStatuses.filter((s: string) => s === 'in_progress' || s === 'in_review').length
        const supabaseTodo = supabaseTaskStatuses.filter((s: string) => s === 'todo').length

        const combinedTotalTasks = tasksData.length + apecTasksData.length
        const combinedCompletedTasks = supabaseDone + apecDone
        const combinedInProgress = supabaseInProgress + apecInProgress
        const combinedTodo = supabaseTodo + apecTodo

        // Tính overdue projects
        const now = new Date()
        const overdueProjects = projectsData.filter((p: any) => {
          if (p.status === 'overdue') return true
          if (p.end_date && (p.status === 'active' || p.status === 'in_progress' || p.status === 'planning')) {
            return new Date(p.end_date) < now
          }
          return false
        }).length

        // Tính tiến độ trung bình
        const projectsWithProgress = projectsData.filter((p: any) => p.progress_percentage > 0)
        const avgProgress = projectsWithProgress.length > 0
          ? Math.round(projectsWithProgress.reduce((sum: number, p: any) => sum + (p.progress_percentage || 0), 0) / projectsWithProgress.length)
          : 0

        setStats({
          totalProjects: projectsData.length,
          activeProjects: projectsData.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length,
          completedProjects: projectsData.filter((p: any) => p.status === 'completed' || p.status === 'done').length,
          overdueProjects,
          planningProjects: projectsData.filter((p: any) => p.status === 'planning' || p.status === 'not_started').length,
          totalIncidents: totalInc,
          unresolvedIncidents: unresolvedInc,
          totalStaff,
          totalImprovements,
          totalTasks: combinedTotalTasks,
          completedTasks: combinedCompletedTasks,
          inProgressTasks: combinedInProgress,
          todoTasks: combinedTodo,
          avgProgress,
        })

      } catch (err: any) {
        console.error('Error loading dashboard:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, activeOrganization, isLoadingOrg])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải dữ liệu thực...</div>
        </div>
      </div>
    )
  }

  if (error && projects.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 max-w-2xl mx-auto mt-10 text-center">
        <h2 className="text-2xl font-bold text-blue-900 mb-3">Chào mừng đến PM Monitor!</h2>
        <p className="text-blue-800 mb-6 text-lg">{error}</p>
        <button
          onClick={() => router.push('/dashboard/organizations')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-blue-200 transition-all"
        >
          Tạo Tổ chức đầu tiên
        </button>
      </div>
    )
  }

  return (
    <div className="pb-10 font-sans">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan giám sát</h1>
        <p className="text-sm text-slate-500">Theo dõi tiến độ dự án, sự cố phát sinh và tình trạng xử lý dựa trên dữ liệu thời gian thực.</p>
      </div>

      {/* VỊ TRÍ 1: HÀNG CHỈ SỐ TỔNG QUAN */}
      <MonitorStatsRow stats={stats} />

      {/* VỊ TRÍ 2: BẢNG THỐNG KÊ & DUYỆT CÔNG VIỆC TOÀN BỘ DỰ ÁN THEO PHÒNG BAN */}
      <DepartmentTasksOverviewTable
        initialTasks={overviewTasks}
        projects={projects}
        departments={departments}
        onRefresh={() => {
          setIsLoading(true)
          supabase.auth.getUser().then(() => {
            // trigger re-fetch
            const ev = new CustomEvent('refresh-dashboard')
            window.dispatchEvent(ev)
          })
        }}
        isLoading={isLoading}
      />

      {/* HÀNG TIẾN ĐỘ & CÔNG VIỆC (4 CỘT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <MiniKanban tasks={tasks} />
        <MiniGantt projects={projects} />
        <ScheduleWidget tasks={tasks} />
        <MonitoringActivity activities={activities} />
      </div>

      {/* HÀNG SỰ CỐ & RỦI RO (3 CỘT) */}
      <IncidentTrendCharts incidents={incidents} />

    </div>
  )
}