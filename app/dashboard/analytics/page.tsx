'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrganization } from '@/components/providers/organization-provider'
import dynamic from 'next/dynamic'
import {
  TrendingUp, Building2, Users, FolderKanban,
  CheckCircle2, RefreshCw, Database, Zap,
} from 'lucide-react'

// Dynamic imports cho biểu đồ (tránh SSR issues với Recharts)
const CompanyProgressChart = dynamic(
  () => import('@/components/analytics/CompanyProgressChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const TaskStatusPieChart = dynamic(
  () => import('@/components/analytics/TaskStatusPieChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const EmployeeWorkloadChart = dynamic(
  () => import('@/components/analytics/EmployeeWorkloadChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const ProjectProgressTable = dynamic(
  () => import('@/components/analytics/ProjectProgressTable'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="h-[380px] flex items-center justify-center">
        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

// KPI Card Component
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  trend,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  iconBg: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{value}</span>
            {trend && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  trend.value >= 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()

  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Data states
  const [executiveSummary, setExecutiveSummary] = useState<any>(null)
  const [employeeWorkload, setEmployeeWorkload] = useState<any>(null)
  const [projectProgress, setProjectProgress] = useState<any>(null)

  const loadAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [summaryRes, workloadRes, progressRes] = await Promise.all([
        fetch('/api/v1/statistics/executive-summary').then(r => r.json()),
        fetch('/api/v1/statistics/employee-workload').then(r => r.json()),
        fetch('/api/v1/statistics/project-progress').then(r => r.json()),
      ])

      if (summaryRes.status === 'success') setExecutiveSummary(summaryRes.data)
      if (workloadRes.status === 'success') setEmployeeWorkload(workloadRes.data)
      if (progressRes.status === 'success') setProjectProgress(progressRes.data)

      setLastUpdated(new Date().toLocaleTimeString('vi-VN'))
    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoadingOrg) {
      loadAllData()
    }
  }, [isLoadingOrg, loadAllData])

  const summary = executiveSummary?.summary || {
    totalCompanies: 0,
    totalProjects: 0,
    totalStaff: 0,
    totalWorkItems: 0,
    overallCompletionRate: 0,
  }

  return (
    <div className="pb-10 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Phân tích & Thống kê</h1>
            <p className="text-sm text-slate-500">
              Dữ liệu đọc từ hệ thống ERP Apec Global — Chỉ hiển thị, không chỉnh sửa
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Database className="w-3.5 h-3.5" />
              Cập nhật: {lastUpdated}
            </div>
          )}
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ===== HÀNG 1: KPI CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Tổ chức"
          value={summary.totalCompanies}
          subtitle="Công ty thuộc tập đoàn"
          icon={Building2}
          iconBg="bg-blue-600"
        />
        <KpiCard
          title="Dự án"
          value={summary.totalProjects}
          subtitle="Dự án đang theo dõi"
          icon={FolderKanban}
          iconBg="bg-indigo-600"
        />
        <KpiCard
          title="Nhân sự"
          value={summary.totalStaff}
          subtitle="Thành viên tập đoàn"
          icon={Users}
          iconBg="bg-purple-600"
        />
        <KpiCard
          title="Tỷ lệ hoàn thành"
          value={`${summary.overallCompletionRate}%`}
          subtitle={`${summary.totalWorkItems} đầu việc tổng`}
          icon={CheckCircle2}
          iconBg={summary.overallCompletionRate >= 50 ? 'bg-emerald-600' : 'bg-amber-600'}
        />
      </div>

      {/* ===== HÀNG 2: BIỂU ĐỒ TIẾN ĐỘ & PHÂN BỐ ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CompanyProgressChart
            data={executiveSummary?.projectsByCompany || []}
            isLoading={isLoading}
          />
        </div>
        <div>
          <TaskStatusPieChart
            data={executiveSummary?.taskStatusDistribution || null}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* ===== HÀNG 3: NHÂN SỰ & DỰ ÁN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EmployeeWorkloadChart
          data={employeeWorkload?.employeeWorkload || []}
          isLoading={isLoading}
        />
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tổng quan Nhân sự</h3>
              <p className="text-xs text-slate-500">Phân bố theo phòng ban</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {(executiveSummary?.staffDistribution || []).map(
              (dept: { name: string; count: number }, idx: number) => {
                const maxCount = Math.max(
                  ...(executiveSummary?.staffDistribution || []).map((d: any) => d.count),
                  1
                )
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-[140px] truncate">{dept.name}</span>
                    <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${Math.max((dept.count / maxCount) * 100, 8)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{dept.count}</span>
                      </div>
                    </div>
                  </div>
                )
              }
            )}
            {(!executiveSummary?.staffDistribution || executiveSummary.staffDistribution.length === 0) && (
              <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu phòng ban
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== HÀNG 4: BẢNG CHI TIẾT DỰ ÁN ===== */}
      <ProjectProgressTable
        data={projectProgress?.projectProgress || []}
        isLoading={isLoading}
      />
    </div>
  )
}
