'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react'

interface ProjectsGanttProps {
  projects: any[]
}

export function ProjectsGantt({ projects }: ProjectsGanttProps) {
  const router = useRouter()

  // Ensure we have a valid timeline scale (months)
  const { timeline, minDate, maxDate } = useMemo(() => {
    if (projects.length === 0) {
      const now = new Date()
      return { 
        timeline: [now], 
        minDate: now, 
        maxDate: new Date(now.getFullYear(), now.getMonth() + 3, 1) 
      }
    }

    let min = new Date(projects[0].start_date || new Date())
    let max = new Date(projects[0].end_date || new Date())

    projects.forEach(p => {
      const s = new Date(p.start_date || new Date())
      const e = new Date(p.end_date || new Date())
      if (s < min) min = s
      if (e > max) max = e
    })

    // Add padding (1 month before, 2 months after)
    min = new Date(min.getFullYear(), min.getMonth() - 1, 1)
    max = new Date(max.getFullYear(), max.getMonth() + 2, 0)

    const tl = []
    let curr = new Date(min)
    while (curr <= max) {
      tl.push(new Date(curr))
      curr.setMonth(curr.getMonth() + 1)
    }

    return { timeline: tl, minDate: min, maxDate: max }
  }, [projects])

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24))

  const getStatusColor = (s: string) => {
    if (s === 'active' || s === 'in_progress') return 'bg-blue-500'
    if (s === 'completed' || s === 'done') return 'bg-green-500'
    if (s === 'overdue') return 'bg-red-500'
    if (s === 'paused') return 'bg-orange-500'
    return 'bg-slate-400'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6 flex flex-col h-[600px]">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 shrink-0">
        <CalendarIcon className="w-5 h-5 text-blue-600" />
        <h2 className="font-bold text-slate-800 text-lg">Biểu đồ Gantt Dự án</h2>
      </div>

      <div className="flex-1 overflow-auto relative">
        <div className="min-w-[1000px] h-full flex flex-col">
          {/* Timeline Header */}
          <div className="flex border-b border-slate-100 bg-slate-50 sticky top-0 z-20 shrink-0">
            <div className="w-[300px] shrink-0 border-r border-slate-100 px-6 py-3 font-semibold text-sm text-slate-600 flex items-center bg-slate-50">
              Tên dự án
            </div>
            <div className="flex-1 flex">
              {timeline.map((date, i) => (
                <div key={i} className="flex-1 border-r border-slate-100 px-2 py-3 text-center text-xs font-semibold text-slate-500 truncate">
                  Tháng {date.getMonth() + 1}/{date.getFullYear()}
                </div>
              ))}
            </div>
          </div>

          {/* Projects Rows */}
          <div className="flex-1 flex flex-col relative z-10">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none z-0 ml-[300px]">
              {timeline.map((_, i) => (
                <div key={i} className="flex-1 border-r border-slate-50 h-full" />
              ))}
            </div>

            {projects.map((project) => {
              const start = project.start_date ? new Date(project.start_date) : new Date()
              const end = project.end_date ? new Date(project.end_date) : new Date(start.getTime() + 7*24*3600*1000)
              
              // Calculate left offset and width percentage relative to the timeline
              const startDiffDays = Math.max(0, (start.getTime() - minDate.getTime()) / (1000 * 3600 * 24))
              const durationDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24))
              
              const leftPercent = (startDiffDays / totalDays) * 100
              const widthPercent = (durationDays / totalDays) * 100

              return (
                <div 
                  key={project.id} 
                  className="flex border-b border-slate-100 group hover:bg-slate-50/50 transition-colors shrink-0 z-10 relative cursor-pointer"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                >
                  <div className="w-[300px] shrink-0 border-r border-slate-100 px-6 py-4 bg-white group-hover:bg-transparent">
                    <div className="font-bold text-slate-800 text-sm truncate mb-1 group-hover:text-blue-600 transition-colors">{project.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-500">
                        {start.toLocaleDateString('vi-VN')} - {end.toLocaleDateString('vi-VN')}
                      </span>
                      {project.status === 'overdue' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                  <div className="flex-1 relative py-4 px-2">
                    {/* Gantt Bar */}
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm group-hover:shadow-md transition-all flex items-center px-3 ${getStatusColor(project.status)} text-white overflow-hidden`}
                      style={{ 
                        left: `calc(${leftPercent}%)`, 
                        width: `calc(${widthPercent}%)`,
                        minWidth: '40px'
                      }}
                      title={`${project.name}\nTiến độ: ${project.progress_percentage || 0}%`}
                    >
                      <span className="text-[10px] font-bold truncate">
                        {project.progress_percentage || 0}%
                      </span>
                      {/* Inner Progress Fill */}
                      <div className="absolute inset-0 bg-white/20" style={{ width: `${project.progress_percentage || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {projects.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm w-full">
                Không có dự án nào
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
