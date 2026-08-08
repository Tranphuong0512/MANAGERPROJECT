'use client'

import { ClipboardCheck, CheckSquare, AlertTriangle, Wrench, Bug, Clock, Lightbulb } from 'lucide-react'

interface TopStatsProps {
  stats: {
    progress: number
    checklistTotal: number
    checklistCompleted: number
    taskTotal: number
    taskCompleted: number
    incidentsTotal: number
    incidentsFixed: number
    newBugs: number
    onTimeRate: number
    improvementsTotal?: number
  }
}

export function ProjectTopStats({ stats }: TopStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      
      {/* 1. Tiến độ tổng thể */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-full border-[3px] border-blue-600 flex items-center justify-center flex-shrink-0 relative">
          <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" style={{ clipPath: `polygon(50% 50%, 50% 0%, ${stats.progress > 50 ? '100% 0, 100% 100%, 0 100%, 0 50%' : '100% 0, 100% 50%'})`}}></div>
          <span className="text-sm font-bold text-slate-800 z-10">{stats.progress}%</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Tiến độ tổng thể</span>
          <div className="text-sm font-bold text-slate-800">
            {stats.progress}%
          </div>
        </div>
      </div>

      {/* 2. Checklist hoàn thành */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Checklist hoàn thành</span>
          <div className="text-base font-bold text-slate-800 flex items-end gap-1.5">
            {stats.checklistCompleted} / <span className="text-sm text-slate-400">{stats.checklistTotal}</span>
            <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded ml-1">{stats.checklistTotal > 0 ? Math.round((stats.checklistCompleted/stats.checklistTotal)*100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* 3. Công việc hoàn thành */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Công việc hoàn thành</span>
          <div className="text-base font-bold text-slate-800 flex items-end gap-1.5">
            {stats.taskCompleted} / <span className="text-sm text-slate-400">{stats.taskTotal}</span>
            <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded ml-1">{stats.taskTotal > 0 ? Math.round((stats.taskCompleted/stats.taskTotal)*100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* 4. Sự cố liên quan */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-500">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Sự cố liên quan</span>
          <div className="text-base font-bold text-slate-800 flex items-end gap-1.5">
            {stats.incidentsTotal} <span className="text-xs text-slate-500 font-medium pb-0.5">Tổng</span>
          </div>
        </div>
      </div>

      {/* 5. Đã khắc phục */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Đã khắc phục</span>
          <div className="text-base font-bold text-slate-800 flex items-end gap-1.5">
            {stats.incidentsFixed} <span className="text-xs text-slate-500 font-medium pb-0.5">Sự cố</span>
          </div>
        </div>
      </div>

      {/* 6. Lỗi mới ghi nhận */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-red-600">
          <Bug className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Lỗi mới ghi nhận</span>
          <div className="text-base font-bold text-slate-800 flex items-end gap-1.5">
            {stats.newBugs} <span className="text-xs text-slate-500 font-medium pb-0.5">Lỗi</span>
          </div>
        </div>
      </div>

      {/* 7. Đề xuất cải tiến */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Đề xuất cải tiến</span>
          <div className="text-base font-bold text-slate-800 flex items-end gap-1.5">
            {stats.improvementsTotal || 0}
          </div>
        </div>
      </div>

    </div>
  )
}
