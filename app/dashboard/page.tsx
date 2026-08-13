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

export default function DashboardPage() {
  const router = useRouter()
  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalIncidents: 0,
    unresolvedIncidents: 0,
    totalStaff: 0,
    totalImprovements: 0,
    totalTasks: 0,
    completedTasks: 0,
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
          .in('organization_id', orgIds)
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

        // Đợi tất cả fetch độc lập hoàn thành
        const [projectsRes, incidentsRes, staffCountRes, improvementsCountRes] = await Promise.all([
          projectsPromise,
          incidentsPromise,
          staffCountPromise,
          improvementsCountPromise
        ]);

        let projectsData = projectsRes.data || [];
        const incidentsData = incidentsRes.data || [];
        const totalStaff = staffCountRes.count || 0;
        const totalImprovements = improvementsCountRes.count || 0;

        setIncidents(incidentsData)

        const projectIds = projectsData.map(p => p.id)

        let tasksData: any[] = []
        let activitiesData: any[] = []

        if (projectIds.length > 0) {
          // Fetch Tasks và Activities song song vì phụ thuộc vào projectIds
          const tasksPromise = supabase
            .from('checklist_items')
            .select(`
              id, title, status, is_completed, end_date, start_date, priority, 
              project_checklists!inner(project_id, projects(name)),
              assignee:staff(full_name, avatar_url)
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

        setProjects(projectsData)
        setTasks(tasksData)
        setActivities(activitiesData)

        // Tính toán Stats
        const totalInc = incidentsData.length
        const unresolvedInc = incidentsData.filter((inc: any) =>
          inc.status === 'new' || inc.status === 'investigating' || inc.status === 'fixing'
        ).length

        setStats({
          totalProjects: projectsData.length,
          activeProjects: projectsData.filter(p => p.status === 'active').length,
          completedProjects: projectsData.filter(p => p.status === 'completed').length,
          totalIncidents: totalInc,
          unresolvedIncidents: unresolvedInc,
          totalStaff,
          totalImprovements,
          totalTasks: tasksData.length,
          completedTasks: tasksData.filter(t => t.status === 'done').length
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

      <MonitorStatsRow stats={stats} />

      {/* HÀNG 1: QUẢN LÝ TIẾN ĐỘ & CÔNG VIỆC (4 CỘT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <MiniKanban tasks={tasks} />
        <MiniGantt projects={projects} />
        <ScheduleWidget tasks={tasks} />
        <MonitoringActivity activities={activities} />
      </div>

      {/* HÀNG 2: QUẢN LÝ SỰ CỐ & RỦI RO (3 CỘT) */}
      <IncidentTrendCharts incidents={incidents} />

    </div>
  )
}