'use client'

import { Lightbulb, CheckCircle2, Clock, TrendingUp, Activity } from 'lucide-react'

interface ImprovementsStatsProps {
  stats: any
}

export function ImprovementsStats({ stats }: ImprovementsStatsProps) {
  const cards = [
    {
      title: 'Tổng cải tiến',
      value: stats.total ?? 0,
      icon: Lightbulb,
      iconBg: 'bg-purple-600',
      desc: 'Tất cả đề xuất',
    },
    {
      title: 'Chờ duyệt',
      value: stats.pending ?? 0,
      icon: Clock,
      iconBg: 'bg-slate-500',
      desc: 'Chờ được xét duyệt',
    },
    {
      title: 'Đang thực hiện',
      value: stats.inProgress ?? 0,
      icon: Activity,
      iconBg: 'bg-blue-500',
      desc: 'Đang tiến hành cải tiến',
    },
    {
      title: 'Đã áp dụng',
      value: stats.implemented ?? 0,
      icon: CheckCircle2,
      iconBg: 'bg-green-500',
      desc: `${stats.total > 0 ? Math.round(((stats.implemented || 0) / (stats.total || 1)) * 100) : 0}% tổng đề xuất`,
    },
    {
      title: 'Tỷ lệ áp dụng',
      value: `${stats.implementRate ?? 0}%`,
      icon: TrendingUp,
      iconBg: 'bg-indigo-500',
      desc: 'Đã đưa vào sử dụng',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl ${card.iconBg} flex items-center justify-center shadow-xs shrink-0`}>
              <card.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-[13px] font-medium text-slate-500 truncate">{card.title}</p>
              <h2 className="font-bold text-slate-800 text-lg sm:text-2xl leading-tight">{card.value}</h2>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500">{card.desc}</p>
        </div>
      ))}
    </div>
  )
}
