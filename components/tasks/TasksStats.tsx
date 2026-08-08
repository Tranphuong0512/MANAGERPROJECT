'use client'

import { FolderOpen, Play, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

interface TasksStatsProps {
  stats: any
}

export function TasksStats({ stats }: TasksStatsProps) {
  const cards = [
    {
      title: 'Tổng công việc',
      value: stats.totalTasks || 128,
      desc: 'Tất cả công việc',
      icon: FolderOpen,
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Đang thực hiện',
      value: stats.activeTasks || 46,
      desc: '36% tổng công việc',
      icon: Play,
      iconBg: 'bg-emerald-400',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Hoàn thành',
      value: stats.completedTasks || 58,
      desc: '45% tổng công việc',
      icon: CheckCircle2,
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Quá hạn',
      value: stats.overdueTasks || 9,
      desc: '7% tổng công việc',
      icon: Clock,
      iconBg: 'bg-orange-400',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Hiệu suất thành công',
      value: `${stats.successRate || 91}%`,
      desc: '↑ 12% so với tuần trước',
      icon: TrendingUp,
      iconBg: 'bg-cyan-400',
      iconColor: 'text-white',
      descColor: 'text-emerald-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex flex-col h-full justify-between w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-slate-500">{card.title}</p>
                <h2 className="font-bold text-slate-800 mt-1 text-2xl">{card.value}</h2>
              </div>
            </div>
            <p className={`text-[11px] font-medium mt-1 ${card.descColor}`}>{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
