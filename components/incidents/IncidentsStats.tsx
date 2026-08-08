'use client'

import { AlertTriangle, Search, Wrench, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'

interface IncidentsStatsProps {
  stats: any
}

export function IncidentsStats({ stats }: IncidentsStatsProps) {
  const cards = [
    {
      title: 'Tổng sự cố',
      value: stats.total ?? 0,
      icon: AlertTriangle,
      iconBg: 'bg-slate-600',
      desc: 'Tất cả sự cố ghi nhận',
    },
    {
      title: 'Mới phát sinh',
      value: stats.new ?? 0,
      icon: XCircle,
      iconBg: 'bg-red-500',
      desc: 'Cần xử lý ngay',
    },
    {
      title: 'Đang xử lý',
      value: stats.inProgress ?? 0,
      icon: Wrench,
      iconBg: 'bg-orange-500',
      desc: 'Đang điều tra / sửa chữa',
    },
    {
      title: 'Đã khắc phục',
      value: stats.resolved ?? 0,
      icon: CheckCircle2,
      iconBg: 'bg-green-500',
      desc: `${stats.total > 0 ? Math.round(((stats.resolved || 0) / (stats.total || 1)) * 100) : 0}% tổng sự cố`,
    },
    {
      title: 'Tỷ lệ xử lý',
      value: `${stats.resolveRate ?? 0}%`,
      icon: TrendingUp,
      iconBg: 'bg-blue-500',
      desc: '↑ 5% so với tháng trước',
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
