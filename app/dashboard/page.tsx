'use client'

import dynamic from 'next/dynamic'
import { usePermissions } from '@/hooks/usePermissions'
import { useDashboardData } from '@/hooks/useDashboardData'
import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const { hasPermission, isLoading: isLoadingPerms } = usePermissions()
  const { data, isLoading, error, refresh } = useDashboardData()

  // ── Loading State ──
  if (isLoading || isLoadingPerms) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải dữ liệu thực...</div>
        </div>
      </div>
    )
  }

  // ── Permission Gate ──
  if (!hasPermission('view_overview')) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-xl mx-auto mt-16 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Quyền truy cập bị hạn chế</h2>
        <p className="text-slate-600 text-sm mb-6">
          Tài khoản của bạn chưa được cấp quyền xem Phân hệ Tổng quan (<code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs">view_overview</code>). Vui lòng liên hệ Quản trị viên để được cấp quyền truy cập.
        </p>
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
        >
          Chuyển tới Danh sách Dự án
        </button>
      </div>
    )
  }

  // ── Error / No Org State ──
  if (error && !data) {
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

  if (!data) return null

  const { stats, tasks, projects, incidents, activities, departments, overviewTasks } = data

  // ── Main Dashboard ──
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
        onRefresh={() => refresh()}
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