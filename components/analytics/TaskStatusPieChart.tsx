'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CheckCircle2 } from 'lucide-react'

interface TaskStatusData {
  total: number
  todo: number
  inProgress: number
  done: number
  overdue: number
}

interface Props {
  data: TaskStatusData | null
  isLoading?: boolean
}

const STATUS_CONFIG = [
  { key: 'done', label: 'Hoàn thành', color: '#22c55e', icon: '✅' },
  { key: 'inProgress', label: 'Đang làm', color: '#3b82f6', icon: '🔄' },
  { key: 'todo', label: 'Chưa bắt đầu', color: '#94a3b8', icon: '📋' },
  { key: 'overdue', label: 'Quá hạn', color: '#ef4444', icon: '⏰' },
]

export default function TaskStatusPieChart({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="h-[380px] flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const chartData = STATUS_CONFIG
    .map(s => ({
      name: s.label,
      value: (data as any)[s.key] || 0,
      color: s.color,
      icon: s.icon,
    }))
    .filter(d => d.value > 0)

  const completionRate = data.total > 0
    ? Math.round((data.done / data.total) * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Phân bố Công việc</h3>
          <p className="text-xs text-slate-500">Tổng {data.total.toLocaleString()} đầu việc</p>
        </div>
      </div>

      <div className="h-[260px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
              formatter={(value: any, name: any) => [
                `${value} (${data.total > 0 ? Math.round((value / data.total) * 100) : 0}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{completionRate}%</div>
            <div className="text-xs text-slate-500">Hoàn thành</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {STATUS_CONFIG.map(s => {
          const value = (data as any)[s.key] || 0
          if (value === 0 && s.key === 'overdue') return null
          return (
            <div
              key={s.key}
              className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2"
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-slate-600 truncate">{s.label}</span>
              <span className="text-xs font-semibold text-slate-900 ml-auto">{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
