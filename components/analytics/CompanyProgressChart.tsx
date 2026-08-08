'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { Building2 } from 'lucide-react'

interface CompanyProgress {
  companyId: string
  companyName: string
  totalProjects: number
  avgProgress: number
  completedProjects: number
  activeProjects: number
}

interface Props {
  data: CompanyProgress[]
  isLoading?: boolean
}

const GRADIENT_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

export default function CompanyProgressChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="h-[380px] flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    ...d,
    shortName: d.companyName.length > 16 ? d.companyName.substring(0, 14) + '…' : d.companyName,
    color: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
  }))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Tiến độ theo Công ty</h3>
          <p className="text-xs text-slate-500">Tiến độ bình quân (%) từ checklist dự án</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-slate-400">
          Chưa có dữ liệu dự án
        </div>
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 45 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="shortName"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                interval={0}
                height={55}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={[0, 100]}
                unit="%"
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '13px',
                  padding: '12px 16px',
                }}
                formatter={(value: any) => [
                  `${value}%`,
                  'Tiến độ TB',
                ]}
                labelFormatter={(label: any) => `🏢 ${label}`}
              />
              <Bar
                dataKey="avgProgress"
                name="Tiến độ TB"
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                ))}
                <LabelList
                  dataKey="avgProgress"
                  position="top"
                  formatter={(v: any) => `${v}%`}
                  style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mini legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.slice(0, 5).map((d, i) => (
          <div
            key={d.companyId}
            className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1"
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="truncate max-w-[120px]">{d.companyName}</span>
            <span className="text-slate-400">({d.totalProjects})</span>
          </div>
        ))}
        {chartData.length > 5 && (
          <span className="text-xs text-slate-400 py-1">+{chartData.length - 5} khác</span>
        )}
      </div>
    </div>
  )
}
