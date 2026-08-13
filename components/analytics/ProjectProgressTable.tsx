'use client'

import React from 'react'
import { FolderOpen, AlertTriangle, Users, CheckCircle2, Lightbulb } from 'lucide-react'

interface ProjectProgress {
  projectId: string
  projectName: string
  projectCode: string | null
  status: string
  totalChecklistItems: number
  completedChecklistItems: number
  progressPercentage: number
  totalTasks: number
  completedTasks: number
  assignedStaffCount: number
  totalIncidents: number
  totalImprovements: number
}

interface Props {
  data: ProjectProgress[]
  isLoading?: boolean
}

function getProgressColor(p: number): string {
  if (p >= 100) return 'bg-emerald-500'
  if (p >= 75) return 'bg-blue-500'
  if (p >= 50) return 'bg-indigo-500'
  if (p >= 25) return 'bg-amber-500'
  return 'bg-slate-300'
}

function getProgressTextColor(p: number): string {
  if (p >= 100) return 'text-emerald-700'
  if (p >= 75) return 'text-blue-700'
  if (p >= 50) return 'text-indigo-700'
  if (p >= 25) return 'text-amber-700'
  return 'text-slate-500'
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Đang triển khai', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    completed: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    on_hold: { label: 'Tạm dừng', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    cancelled: { label: 'Hủy bỏ', className: 'bg-red-50 text-red-700 border-red-200' },
  }
  const config = map[status] || map.active
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.className}`}>
      {config.label}
    </span>
  )
}

export default function ProjectProgressTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="h-[400px] flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <FolderOpen className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Chi tiết Tiến độ Dự án</h3>
          <p className="text-xs text-slate-500">{data.length} dự án đang theo dõi</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
          Chưa có dữ liệu dự án
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Dự án
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[100px]">
                  Trạng thái
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[200px]">
                  Tiến độ
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[70px]">
                  <Users className="w-3.5 h-3.5 inline" />
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[70px]">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" />
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[70px]">
                  <AlertTriangle className="w-3.5 h-3.5 inline" />
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[70px]">
                  <Lightbulb className="w-3.5 h-3.5 inline" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((prj) => (
                <tr key={prj.projectId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="font-medium text-slate-900 truncate max-w-[220px]">
                      {prj.projectName}
                    </div>
                    {prj.projectCode && (
                      <div className="text-[10px] text-slate-400 font-mono">{prj.projectCode}</div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {getStatusBadge(prj.status)}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(prj.progressPercentage)}`}
                          style={{ width: `${Math.min(prj.progressPercentage, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-[38px] text-right ${getProgressTextColor(prj.progressPercentage)}`}>
                        {prj.progressPercentage}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {prj.completedChecklistItems}/{prj.totalChecklistItems} items
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg px-2 py-0.5">
                      {prj.assignedStaffCount}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs font-semibold text-emerald-600">
                      {prj.completedTasks}/{prj.totalTasks}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {prj.totalIncidents > 0 ? (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-2 py-0.5">
                        {prj.totalIncidents}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {prj.totalImprovements > 0 ? (
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 rounded-lg px-2 py-0.5">
                        {prj.totalImprovements}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
