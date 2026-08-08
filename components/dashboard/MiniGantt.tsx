'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, memo } from 'react'

interface MiniGanttProps {
  projects: any[]
}

export const MiniGantt = memo(function MiniGantt({ projects }: MiniGanttProps) {
  const router = useRouter()

  // Determine date range for the timeline
  const { minDate, maxDate, days, totalDays, monthText } = useMemo(() => {
    const today = new Date()
    // By default show 30 days around today
    let minD = new Date(today)
    minD.setDate(today.getDate() - 10)
    let maxD = new Date(today)
    maxD.setDate(today.getDate() + 20)

    // If there are projects, adjust to fit their timeline (within reason)
    if (projects.length > 0) {
      const validProjects = projects.filter((p: any) => p.start_date && p.end_date)
      if (validProjects.length > 0) {
        const starts = validProjects.map((p: any) => new Date(p.start_date).getTime())
        const ends = validProjects.map((p: any) => new Date(p.end_date).getTime())
        const earliest = new Date(Math.min(...starts))
        const latest = new Date(Math.max(...ends))

        // Limit to 45 days max to keep the mini chart readable
        const diffDays = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 3600 * 24))
        if (diffDays <= 45) {
          minD = earliest
          maxD = latest
        }
      }
    }

    minD.setHours(0, 0, 0, 0)
    maxD.setHours(23, 59, 59, 999)

    const totalDays = Math.max(1, Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24)))

    // Generate an array of day numbers for the header (skip some to fit)
    const daysArr = []
    let step = totalDays > 20 ? 2 : 1
    for (let i = 0; i <= totalDays; i += step) {
      const d = new Date(minD.getTime() + i * 24 * 3600 * 1000)
      daysArr.push(d.getDate())
    }

    const month1 = minD.getMonth() + 1
    const month2 = maxD.getMonth() + 1
    const year1 = minD.getFullYear()
    const year2 = maxD.getFullYear()

    let mText = `Tháng ${month1}, ${year1}`
    if (month1 !== month2 || year1 !== year2) {
      mText = `Tháng ${month1} - Tháng ${month2}, ${year2}`
    }

    return { minDate: minD, maxDate: maxD, days: daysArr, totalDays, monthText: mText }
  }, [projects])

  const colors = ['bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-slate-400']

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-[380px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-bold text-slate-800">Gantt timeline mini</h2>
        <Link href="/dashboard/projects" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem thêm</Link>
      </div>

      <div className="text-[13px] font-bold text-slate-800 mb-4">{monthText}</div>

      <div className="relative flex-1">
        {/* Timeline Header */}
        <div className="flex items-end justify-between border-b border-slate-200 pb-2 mb-4 h-6">
          <div className="w-[120px] shrink-0"></div>
          <div className="flex-1 flex justify-between px-2">
            {days.map((day: number, i: number) => (
              <span key={i} className="text-[10px] font-medium text-slate-400">{day}</span>
            ))}
          </div>
        </div>

        {/* Project Bars */}
        <div className="space-y-4 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
          {projects.slice(0, 5).map((project: any, idx: number) => {
            let leftPercent = 0
            let widthPercent = 0
            let hasValidDates = false

            if (project.start_date && project.end_date) {
              const startT = new Date(project.start_date).getTime()
              const endT = new Date(project.end_date).getTime()
              const minT = minDate.getTime()
              const maxT = maxDate.getTime()

              if (endT >= minT && startT <= maxT) {
                hasValidDates = true
                const boundedStart = Math.max(startT, minT)
                const boundedEnd = Math.min(endT, maxT)

                leftPercent = ((boundedStart - minT) / (maxT - minT)) * 100
                widthPercent = ((boundedEnd - boundedStart) / (maxT - minT)) * 100
                widthPercent = Math.max(2, widthPercent) // at least visible
              }
            }

            const barColor = colors[idx % colors.length]

            return (
              <div
                key={project.id}
                className="flex items-center group cursor-pointer"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <div className="w-[120px] shrink-0 text-[11px] font-semibold text-slate-700 truncate pr-2 group-hover:text-blue-600 transition-colors">
                  {project.name}
                </div>
                <div className="flex-1 relative h-4 bg-slate-50/50 rounded-full">
                  {hasValidDates ? (
                    <div
                      className={`absolute top-0 h-full rounded-full ${barColor} shadow-sm group-hover:opacity-90 transition-opacity`}
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    ></div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-400">
                      Chưa có timeline
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})