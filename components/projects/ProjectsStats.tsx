'use client'

import { FolderOpen, Play, CheckCircle2, AlertTriangle, ShieldAlert, Timer, DollarSign, FolderKanban } from 'lucide-react'

interface ProjectsStatsProps {
  stats: any
}

export function ProjectsStats({ stats }: ProjectsStatsProps) {
  const formatBudget = (amount: number) => {
    if (!amount) return '0đ'
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} triệu`
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
  }

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
      title: 'Trễ hạn',
      value: stats.overdueProjects || 0,
      desc: stats.overdueProjects > 0 ? 'Cần chú ý tiến độ' : 'Tất cả đúng hạn',
      icon: Timer,
      iconBg: stats.overdueProjects > 0 ? 'bg-rose-500' : 'bg-slate-400',
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
    {
      title: 'Tổng ngân sách',
      value: formatBudget(stats.totalBudget || 0),
      desc: 'Ngân sách tổng hợp',
      icon: DollarSign,
      iconBg: 'bg-amber-500',
      isText: true,
    },
    {
      title: 'Công việc',
      value: stats.totalTasks || 0,
      desc: `${stats.totalTasks > 0 ? Math.round(((stats.completedTasks || 0) / stats.totalTasks) * 100) : 0}% hoàn thành`,
      icon: FolderKanban,
      iconBg: 'bg-teal-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-500 truncate">{card.title}</p>
              <h2 className={`font-bold text-slate-800 mt-0.5 ${(card as any).isText ? 'text-sm' : 'text-xl'} leading-tight truncate`}>{card.value}</h2>
            </div>
          </div>
          <p className="text-[10px] font-medium text-slate-400 truncate">{card.desc}</p>
        </div>
      ))}
    </div>
  )
}

