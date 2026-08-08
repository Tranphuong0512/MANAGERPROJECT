'use client'

import { Users, UserCheck, Hourglass, CalendarOff, TrendingUp } from 'lucide-react'

interface MembersStatsProps {
  stats: any
}

export function MembersStats({ stats }: MembersStatsProps) {
  const cards = [
    {
      title: 'Tổng nhân sự',
      value: stats.totalMembers || 248,
      desc: 'Tất cả nhân viên',
      icon: Users,
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Đang làm việc',
      value: stats.activeMembers || 228,
      desc: '92% tổng nhân sự',
      icon: UserCheck,
      iconBg: 'bg-emerald-400',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Thử việc',
      value: stats.probation || 12,
      desc: '5% tổng nhân sự',
      icon: Hourglass,
      iconBg: 'bg-orange-400',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Nghỉ phép hôm nay',
      value: stats.onLeave || 8,
      desc: '3% tổng nhân sự',
      icon: CalendarOff,
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
      descColor: 'text-slate-500',
    },
    {
      title: 'Hiệu suất trung bình',
      value: `${stats.avgPerformance || 89}%`,
      desc: '↑ 6% so với tháng trước',
      icon: TrendingUp,
      iconBg: 'bg-purple-500',
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
