'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MiniKanbanProps {
  tasks: any[]
}

export const MiniKanban = React.memo(function MiniKanban({ tasks }: MiniKanbanProps) {
  const router = useRouter()

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'in_review')

  const renderTaskMini = (task: any, statusColor: string, bgColor: string) => {
    const dateStr = task.due_date 
      ? new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : 'No date'

    return (
      <div 
        key={task.id} 
        onClick={() => router.push(`/dashboard/projects/${task.project_id}`)}
        className={`p-3 rounded-xl border border-slate-100 ${bgColor} cursor-pointer hover:shadow-md transition-all flex flex-col gap-2 relative group`}
      >
        <div className="text-[12px] font-semibold text-slate-700 leading-tight line-clamp-2 pr-4">
          {task.title}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] font-medium text-slate-500">{dateStr}</span>
          {task.assignee?.avatar_url ? (
            <img src={task.assignee.avatar_url} className="w-5 h-5 rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
              {task.assignee?.full_name ? task.assignee.full_name.charAt(0) : '?'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-[380px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-slate-800">Kanban mini</h2>
        <Link href="/dashboard/projects" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem thêm</Link>
      </div>

      {/* Header Status */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
          <span className="text-[11px] font-bold text-slate-700">To do</span>
          <span className="text-[11px] font-medium text-slate-400">{todoTasks.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
          <span className="text-[11px] font-bold text-orange-600">In Progress</span>
          <span className="text-[11px] font-medium text-slate-400">{inProgressTasks.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span className="text-[11px] font-bold text-emerald-600">Done</span>
          <span className="text-[11px] font-medium text-slate-400">{doneTasks.length}</span>
        </div>
      </div>

      {/* Grid of tasks */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {todoTasks.slice(0, 2).map(t => renderTaskMini(t, 'slate', 'bg-slate-50/50 hover:bg-slate-50'))}
          {inProgressTasks.slice(0, 2).map(t => renderTaskMini(t, 'orange', 'bg-orange-50/30 hover:bg-orange-50'))}
          {doneTasks.slice(0, 2).map(t => renderTaskMini(t, 'emerald', 'bg-emerald-50/30 hover:bg-emerald-50'))}
        </div>
      </div>

      {/* Footer counts */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 px-2">
        <span className="text-[10px] font-medium text-slate-400">+{Math.max(0, todoTasks.length - 2)} công việc</span>
        <span className="text-[10px] font-medium text-slate-400">+{Math.max(0, inProgressTasks.length - 2)} công việc</span>
        <span className="text-[10px] font-medium text-slate-400">+{Math.max(0, doneTasks.length - 2)} công việc</span>
      </div>
    </div>
  )
})
