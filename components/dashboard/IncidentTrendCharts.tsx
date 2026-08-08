'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useRouter } from 'next/navigation'

interface IncidentTrendChartsProps {
  incidents: any[]
}

const SEVERITY_INFO = {
  critical: { label: 'Nghiêm trọng', color: '#ef4444', targetHours: 2 },
  high: { label: 'Cao', color: '#f97316', targetHours: 8 },
  medium: { label: 'Trung bình', color: '#eab308', targetHours: 24 },
  low: { label: 'Thấp', color: '#94a3b8', targetHours: 72 },
}

export function IncidentTrendCharts({ incidents = [] }: IncidentTrendChartsProps) {
  const router = useRouter()

  // 1. Chart 1: Sự cố theo ngày trong tuần (Stacked Bar)
  const weeklyData = useMemo(() => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const data = [
      { name: 'T2', critical: 0, high: 0, medium: 0, low: 0, sort: 1 },
      { name: 'T3', critical: 0, high: 0, medium: 0, low: 0, sort: 2 },
      { name: 'T4', critical: 0, high: 0, medium: 0, low: 0, sort: 3 },
      { name: 'T5', critical: 0, high: 0, medium: 0, low: 0, sort: 4 },
      { name: 'T6', critical: 0, high: 0, medium: 0, low: 0, sort: 5 },
      { name: 'T7', critical: 0, high: 0, medium: 0, low: 0, sort: 6 },
      { name: 'CN', critical: 0, high: 0, medium: 0, low: 0, sort: 7 },
    ]

    // Get incidents from the last 7 days
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    incidents.forEach(inc => {
      const d = new Date(inc.created_at)
      if (d >= oneWeekAgo) {
        const dayStr = days[d.getDay()]
        const dayData = data.find(item => item.name === dayStr)
        if (dayData && inc.severity) {
          if (inc.severity === 'critical') dayData.critical++
          else if (inc.severity === 'high') dayData.high++
          else if (inc.severity === 'medium') dayData.medium++
          else if (inc.severity === 'low') dayData.low++
        }
      }
    })

    return data.sort((a, b) => a.sort - b.sort)
  }, [incidents])

  // 2. Chart 2: Thời gian xử lý trung bình
  const avgTimeData = useMemo(() => {
    const stats: any = {
      critical: { totalHours: 0, count: 0 },
      high: { totalHours: 0, count: 0 },
      medium: { totalHours: 0, count: 0 },
      low: { totalHours: 0, count: 0 },
    }

    incidents.forEach(inc => {
      if ((inc.status === 'resolved' || inc.status === 'closed') && inc.updated_at) {
        const created = new Date(inc.created_at).getTime()
        const resolved = new Date(inc.updated_at).getTime()
        const hours = (resolved - created) / (1000 * 60 * 60)
        
        if (stats[inc.severity]) {
          stats[inc.severity].totalHours += hours
          stats[inc.severity].count++
        }
      }
    })

    return [
      { key: 'critical', ...SEVERITY_INFO.critical, avg: stats.critical.count > 0 ? (stats.critical.totalHours / stats.critical.count).toFixed(1) : 0 },
      { key: 'high', ...SEVERITY_INFO.high, avg: stats.high.count > 0 ? (stats.high.totalHours / stats.high.count).toFixed(1) : 0 },
      { key: 'medium', ...SEVERITY_INFO.medium, avg: stats.medium.count > 0 ? (stats.medium.totalHours / stats.medium.count).toFixed(1) : 0 },
      { key: 'low', ...SEVERITY_INFO.low, avg: stats.low.count > 0 ? (stats.low.totalHours / stats.low.count).toFixed(1) : 0 },
    ]
  }, [incidents])

  // 3. Chart 3: Top dự án có sự cố
  const topProjects = useMemo(() => {
    const projectStats: Record<string, { id: string, name: string, total: number, resolved: number, unresolved: number }> = {}
    
    incidents.forEach(inc => {
      if (!inc.project_id) return
      
      const pName = inc.projects?.name || 'Dự án'
      if (!projectStats[inc.project_id]) {
        projectStats[inc.project_id] = { id: inc.project_id, name: pName, total: 0, resolved: 0, unresolved: 0 }
      }
      
      projectStats[inc.project_id].total++
      if (inc.status === 'resolved' || inc.status === 'closed') {
        projectStats[inc.project_id].resolved++
      } else {
        projectStats[inc.project_id].unresolved++
      }
    })

    return Object.values(projectStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [incidents])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* 1. Sự cố theo ngày trong tuần */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[380px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-slate-800">Sự cố theo ngày trong tuần</h3>
          <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600 bg-transparent">
            <option>Tuần này</option>
          </select>
        </div>

        <div className="flex items-center gap-3 mb-4 text-[10px] font-semibold text-slate-600 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Nghiêm trọng</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Cao</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Trung bình</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Thấp</div>
        </div>

        <div className="flex-1 w-full relative -left-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              <Bar dataKey="critical" name="Nghiêm trọng" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={20} />
              <Bar dataKey="high" name="Cao" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} maxBarSize={20} />
              <Bar dataKey="medium" name="Trung bình" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} maxBarSize={20} />
              <Bar dataKey="low" name="Thấp" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Thời gian xử lý trung bình */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[380px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[15px] font-bold text-slate-800">Thời gian xử lý trung bình</h3>
        </div>

        <div className="flex-1 flex flex-col justify-between pb-4">
          {avgTimeData.map((item, i) => {
            // Calculate width based on target (max 200% of target)
            const percent = Math.min(100, (Number(item.avg) / (item.targetHours * 2)) * 100) || 5
            
            return (
              <div key={i} className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[12px] font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold" style={{ color: item.color }}>
                      {Number(item.avg) > 0 ? `${item.avg}h` : '0h'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Mục tiêu: {item.targetHours}h</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.max(2, percent)}%`, backgroundColor: item.color }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Top dự án có sự cố */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[380px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[15px] font-bold text-slate-800">Top dự án có sự cố</h3>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {topProjects.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              Chưa có sự cố nào
            </div>
          ) : (
            topProjects.map((p, i) => {
              const resolvedPercent = (p.resolved / p.total) * 100
              const unresolvedPercent = (p.unresolved / p.total) * 100

              return (
                <div key={i} className="mb-5 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    >
                      <span className="text-[12px] font-bold text-slate-400 w-4">{i + 1}</span>
                      <span className="text-[13px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-[12px] font-bold text-slate-800">
                      {p.total} <span className="text-[10px] text-slate-400 font-medium">sự cố</span>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 rounded-full flex overflow-hidden mb-1.5">
                    {resolvedPercent > 0 && (
                      <div className="h-full bg-emerald-500" style={{ width: `${resolvedPercent}%` }}></div>
                    )}
                    {unresolvedPercent > 0 && (
                      <div className="h-full bg-red-400" style={{ width: `${unresolvedPercent}%` }}></div>
                    )}
                    {p.total === 0 && (
                      <div className="h-full bg-slate-100 w-full"></div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500">Đã xử lý: {p.resolved}</span>
                    <span className="text-[10px] font-medium text-slate-500">Chưa xử lý: {p.unresolved}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
