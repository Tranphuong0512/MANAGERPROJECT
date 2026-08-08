'use client'

import { Paperclip, MessageSquare, Calendar, Plus } from 'lucide-react'

interface TasksKanbanProps {
  tasks: any[]
  onTaskClick: (task: any) => void
  canCreate?: boolean
}

export function TasksKanban({ tasks, onTaskClick, canCreate = true }: TasksKanbanProps) {
  const todoTasks = tasks?.filter(t => t.status === 'todo' && !t.done) || []
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || []
  const reviewTasks = tasks?.filter(t => t.status === 'review') || []
  const doneTasks = tasks?.filter(t => t.status === 'done' || t.done) || []

  const columns = [
    { id: 'todo', title: 'Cần làm', count: todoTasks.length, headerColor: 'text-slate-800', list: todoTasks },
    { id: 'in_progress', title: 'Đang thực hiện', count: inProgressTasks.length, headerColor: 'text-blue-600', list: inProgressTasks },
    { id: 'in_review', title: 'Chờ duyệt', count: reviewTasks.length, headerColor: 'text-orange-500', list: reviewTasks },
    { id: 'done', title: 'Hoàn thành', count: doneTasks.length, headerColor: 'text-green-500', list: doneTasks },
  ]

  const getPriorityStyle = (p: string) => {
    if (p === 'critical' || p === 'high') return 'text-red-500 border-red-200 bg-white'
    if (p === 'medium') return 'text-orange-500 border-orange-200 bg-white'
    return 'text-green-500 border-green-200 bg-white'
  }

  const getPriorityText = (p: string) => {
    if (p === 'critical' || p === 'high') return 'Cao'
    if (p === 'medium') return 'Trung bình'
    return 'Thấp'
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
      {columns.map(col => (
        <div key={col.id} className="min-w-[300px] max-w-[300px] flex flex-col h-full bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className={`font-bold ${col.headerColor}`}>{col.title}</h3>
            <span className="text-xs font-bold text-slate-500">{col.count}</span>
          </div>

          <div className="flex flex-col gap-3">
            {col.list.map(task => (
              <div 
                key={task.id} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                onClick={() => onTaskClick(task)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`text-[13px] font-bold leading-tight pr-2 ${task.done ? 'text-slate-500 line-through' : 'text-slate-800 group-hover:text-blue-600 transition-colors'}`}>
                    {task.title}
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 border ${getPriorityStyle(task.priority)}`}>
                    {getPriorityText(task.priority)}
                  </span>
                </div>
                
                <p className="text-[11px] font-medium text-slate-500 mb-4 truncate">{task.project}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                      {task.assigneeInitials}
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium truncate max-w-[80px]">{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {task.date}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${task.labelColor}`}>
                    {task.label}
                  </span>

                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                    <div className="flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      {task.progress}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {task.comments}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {canCreate && (
            <button className="mt-3 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition-colors border border-dashed border-slate-200 hover:border-blue-200 w-full">
              <Plus className="w-3.5 h-3.5" />
              Thêm công việc
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
