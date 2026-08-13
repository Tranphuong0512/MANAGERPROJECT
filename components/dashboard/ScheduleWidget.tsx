'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { VN_TIMEZONE } from '@/lib/utils'

interface ScheduleWidgetProps {
  tasks: any[]
}

const DOT_COLORS = ['bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-slate-500', 'bg-blue-500', 'bg-red-500']

export const ScheduleWidget = React.memo(function ScheduleWidget({ tasks }: ScheduleWidgetProps) {
  const router = useRouter()

  const scheduleData = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    
    // Lọc các công việc có due_date và chưa hoàn thành
    const dueTasks = tasks.filter(t => t.due_date && t.status !== 'done')
    
    // Sắp xếp theo due_date tăng dần
    dueTasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

    // Gom nhóm theo ngày hiển thị (DD/MM) theo giờ Việt Nam
    const grouped: Record<string, { dateObj: Date; dateStr: string; dayName: string; items: any[] }> = {}
    dueTasks.forEach(task => {
      const d = new Date(task.due_date)
      if (isNaN(d.getTime())) return

      const dayFormatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: VN_TIMEZONE,
        weekday: 'short',
      }).format(d)
      const dayName = dayFormatted.includes('CN') ? 'CN' : dayFormatted.replace('Th ', 'T').replace('Thứ ', 'T')

      const dateStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: VN_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
      }).format(d)

      const key = `${dateStr}_${dayName}`
      if (!grouped[key]) {
        grouped[key] = { dateObj: d, dateStr, dayName, items: [] }
      }
      grouped[key].items.push(task)
    })

    const result = Object.values(grouped).map(g => ({
      dayName: g.dayName,
      dateStr: g.dateStr,
      timestamp: g.dateObj.getTime(),
      items: g.items,
    }))
    
    result.sort((a, b) => a.timestamp - b.timestamp)
    return result.slice(0, 4)
  }, [tasks])

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-[380px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-slate-800">Lịch deadline trong tuần</h2>
        <Link href="/dashboard/projects" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem lịch đầy đủ</Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {scheduleData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            Không có deadline nào sắp tới
          </div>
        ) : (
          scheduleData.map((group, gIdx) => (
            <div key={gIdx} className="flex gap-4">
              {/* Left column: Date */}
              <div className="flex flex-col items-center w-10 shrink-0">
                <span className="text-[11px] font-bold text-blue-600">{group.dayName}</span>
                <span className="text-[10px] font-medium text-slate-500">{group.dateStr}</span>
              </div>
              
              {/* Right column: Tasks */}
              <div className="flex-1 space-y-3">
                {group.items.map((task, tIdx) => {
                  const color = DOT_COLORS[(gIdx + tIdx) % DOT_COLORS.length]
                  
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => router.push(`/dashboard/projects/${task.project_id}`)}
                      className="bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`}></div>
                        <span className="text-[12px] font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {task.priority === 'critical' ? 'Gấp' : task.priority === 'high' ? 'Cao' : 'Thường'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})
