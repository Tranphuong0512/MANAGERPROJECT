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
