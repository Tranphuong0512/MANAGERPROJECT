'use client'

import React from 'react'
import { FolderOpen, AlertTriangle, CheckCircle2, Clock, ShieldAlert, Users, Lightbulb, FolderKanban, Timer, FileWarning } from 'lucide-react'

interface MonitorStatsRowProps {
  stats: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    overdueProjects: number
    planningProjects: number
    totalIncidents: number
    unresolvedIncidents: number
    totalStaff: number
    totalImprovements: number
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    todoTasks: number
    avgProgress: number
  }
}

export const MonitorStatsRow = React.memo(function MonitorStatsRow({ stats }: MonitorStatsRowProps) {
  const cards = [
    {
      title: 'Tổng dự án',
      value: stats.totalProjects,
      icon: FolderOpen,
      iconBg: 'bg-blue-500',
      desc: 'Tất cả dự án đang quản lý',
    },
    {
      title: 'Đang triển khai',
      value: stats.activeProjects,
      icon: Clock,
      iconBg: 'bg-emerald-500',
      desc: `${stats.totalProjects > 0 ? Math.round((stats.activeProjects / stats.totalProjects) * 100) : 0}% tổng dự án`,
    },
    {
      title: 'Hoàn thành',
      value: stats.completedProjects,
      icon: CheckCircle2,
      iconBg: 'bg-purple-500',
      desc: `${stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}% tổng dự án`,
    },
    {
      title: 'Tổng sự cố',
      value: stats.totalIncidents,
      icon: AlertTriangle,
      iconBg: 'bg-orange-500',
      desc: 'Tất cả sự cố ghi nhận',
    },
    {
      title: 'Chưa xử lý',
      value: stats.unresolvedIncidents,
      icon: ShieldAlert,
      iconBg: stats.unresolvedIncidents > 0 ? 'bg-red-500' : 'bg-slate-400',
      desc: stats.unresolvedIncidents > 0 ? 'Cần xử lý gấp' : 'Không có sự cố tồn đọng',
    },
    {
      title: 'Nhân sự',
      value: stats.totalStaff,
      icon: Users,
      iconBg: 'bg-indigo-500',
      desc: 'Thành viên tham gia tổ chức',
    },
    {
      title: 'Sáng kiến',
      value: stats.totalImprovements,
      icon: Lightbulb,
      iconBg: 'bg-yellow-500',
      desc: 'Cải tiến được ghi nhận',
    },
    {
      title: 'Công việc',
      value: stats.totalTasks,
      icon: FolderKanban,
      iconBg: 'bg-teal-500',
      desc: `${stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% đã hoàn thành`,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl p-2.5 sm:p-3 shadow-xs hover:shadow-sm border border-slate-100 flex items-center gap-2.5 transition-all">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${card.iconBg} flex items-center justify-center shadow-xs flex-shrink-0`}>
            <card.icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-[10px] font-medium text-slate-500 truncate">{card.title}</p>
            <h2 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">{card.value}</h2>
            <p className="text-[9px] font-medium text-slate-400 truncate hidden xl:block">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
})
