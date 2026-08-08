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
} from 'recharts'
import { Users } from 'lucide-react'

interface EmployeeWorkload {
  employeeId: string
  fullName: string
  position: string
  department: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalChecklistItems: number
  completedChecklistItems: number
  completionRate: number
}

interface Props {
  data: EmployeeWorkload[]
  isLoading?: boolean
}

function getBarColor(rate: number): string {
  if (rate >= 80) return '#22c55e'
  if (rate >= 50) return '#3b82f6'
  if (rate >= 25) return '#f59e0b'
  return '#94a3b8'
}

export default function EmployeeWorkloadChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="h-[420px] flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Lấy top 15 nhân sự có nhiều việc nhất
  const topEmployees = data
    .filter(e => e.totalTasks + e.totalChecklistItems > 0)
    .slice(0, 15)
    .map(e => ({
      ...e,
      totalWork: e.totalTasks + e.totalChecklistItems,
      doneWork: e.completedTasks + e.completedChecklistItems,
      shortName: e.fullName.length > 18 ? e.fullName.substring(0, 16) + '…' : e.fullName,
    }))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Khối lượng Công việc Nhân sự</h3>
          <p className="text-xs text-slate-500">
            Top {topEmployees.length} nhân sự có nhiều đầu việc nhất
          </p>
        </div>
      </div>

      {topEmployees.length === 0 ? (
        <div className="h-[360px] flex items-center justify-center text-sm text-slate-400">
          Chưa có dữ liệu công việc trong tháng
        </div>
      ) : (
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topEmployees}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              barCategoryGap="15%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                dataKey="shortName"
                type="category"
                width={130}
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#334155' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '13px',
                  padding: '12px 16px',
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null
                  const d = payload[0].payload as typeof topEmployees[0]
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg text-sm space-y-1.5">
                      <div className="font-bold text-slate-900">{d.fullName}</div>
                      <div className="text-slate-500 text-xs">{d.position} — {d.department}</div>
                      <hr className="border-slate-100" />
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-600">Tổng đầu việc:</span>
                        <span className="font-semibold">{d.totalWork}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-600">Đã hoàn thành:</span>
                        <span className="font-semibold text-emerald-600">{d.doneWork}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-600">Tỷ lệ:</span>
                        <span className="font-semibold">{d.completionRate}%</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="totalWork" name="Tổng việc" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {topEmployees.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.completionRate)} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Completion rate legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          ≥80% hoàn thành
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          50-79%
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          25-49%
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          &lt;25%
        </div>
      </div>
    </div>
  )
}
