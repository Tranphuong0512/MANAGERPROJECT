'use client'

import { FolderOpen, Play, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'

interface ProjectsStatsProps {
  stats: any
}

export function ProjectsStats({ stats }: ProjectsStatsProps) {
  const cards = [
    {
      title: 'Tổng dự án',
      value: stats.totalProjects || 0,
      desc: 'Tất cả dự án',
      icon: FolderOpen,
      iconBg: 'bg-blue-500',
    },
    {
      title: 'Đang triển khai',
      value: stats.activeProjects || 0,
      desc: `${stats.totalProjects > 0 ? Math.round((stats.activeProjects / stats.totalProjects) * 100) : 0}% tổng dự án`,
      icon: Play,
      iconBg: 'bg-emerald-400',
    },
    {
      title: 'Hoàn thành',
      value: stats.completedProjects || 0,
      desc: `${stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}% tổng dự án`,
      icon: CheckCircle2,
      iconBg: 'bg-purple-500',
    },
    {
      title: 'Tổng sự cố',
      value: stats.totalIncidents || 0,
      desc: 'Tất cả sự cố ghi nhận',
      icon: AlertTriangle,
      iconBg: 'bg-orange-500',
    },
    {
      title: 'Sự cố chưa xử lý',
      value: stats.unresolvedIncidents || 0,
      desc: stats.unresolvedIncidents > 0 ? 'Cần xử lý gấp' : 'Không có tồn đọng',
      icon: ShieldAlert,
      iconBg: stats.unresolvedIncidents > 0 ? 'bg-red-500' : 'bg-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-slate-500">{card.title}</p>
              <h2 className="font-bold text-slate-800 mt-0.5 text-2xl">{card.value}</h2>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500">{card.desc}</p>
        </div>
      ))}
    </div>
  )
}
