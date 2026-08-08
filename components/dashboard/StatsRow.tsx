'use client'

import { FolderOpen, Play, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

interface StatsRowProps {
  stats: any
}

export function StatsRow({ stats }: StatsRowProps) {
  const cards = [
    {
      title: 'Tổng dự án',
      value: stats.totalProjects || 24,
      desc: 'Tất cả dự án',
      icon: FolderOpen,
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      descColor: 'text-green-500',
    },
    {
      title: 'Đang thực hiện',
      value: stats.activeProjects || 12,
      desc: '50% tổng dự án',
      icon: Play,
      iconBg: 'bg-emerald-400',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Hoàn thành đúng hạn',
      value: stats.completedProjects || 18,
      desc: '75% tổng dự án',
      icon: CheckCircle2,
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Quá hạn',
      value: stats.overdueProjects || 3,
      desc: '12% tổng dự án',
      icon: Clock,
      iconBg: 'bg-orange-400',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Hiệu suất nhóm',
      value: stats.teamPerformance || 'Chưa có',
      desc: 'Hiệu suất tổng thể',
      icon: TrendingUp,
      iconBg: 'bg-cyan-400',
      iconColor: 'text-white',
      descColor: 'text-green-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">{card.title}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{card.value}</h2>
            </div>
            <p className={`text-[11px] font-medium mt-1 ${card.descColor}`}>{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
