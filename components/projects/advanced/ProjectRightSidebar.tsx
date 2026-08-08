'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowUp, Flag } from 'lucide-react'

interface RightSidebarProps {
  stats: {
    todo: number
    inProgress: number
    review: number
    done: number
    overdueTasks?: number
    doneThisWeek?: number
    nextMilestone?: { title: string, end_date: string } | null
  }
}

export function ProjectRightSidebar({ stats }: RightSidebarProps) {
  const total = stats.todo + stats.inProgress + stats.review + stats.done
  const getPercent = (val: number) => total > 0 ? Math.round((val/total)*100) : 0

  const data = [
    { name: 'Hoàn thành', value: getPercent(stats.done), color: '#3b82f6' },
    { name: 'Đang xử lý', value: getPercent(stats.inProgress), color: '#10b981' },
    { name: 'Chờ duyệt', value: getPercent(stats.review), color: '#f59e0b' },
    { name: 'Chưa bắt đầu', value: getPercent(stats.todo), color: '#cbd5e1' },
  ]

  const chartData = data.filter(d => d.value > 0)
  
  const renderDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    const days = Math.ceil(diff / (1000 * 3600 * 24))
    if (days < 0) return 'Đã trễ'
    if (days === 0) return 'Hôm nay'
    return `Còn ${days} ngày`
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-800 text-sm mb-3">Tình trạng & Kết quả</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        
        {/* Biểu đồ tròn */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.length > 0 ? chartData : [{value: 1, color: '#f1f5f9'}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.length > 0 ? chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  )) : (
                    <Cell fill="#f1f5f9" />
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col justify-center space-y-1.5 w-40">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 truncate max-w-[90px]">{item.name}</span>
                </div>
                <span className="text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-px h-16 bg-slate-100 hidden md:block"></div>

        {/* Các thẻ thống kê dạng hàng ngang */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Tuần này</div>
            <div className="text-lg font-bold text-green-600 flex items-center gap-1">
              {stats.doneThisWeek || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Task hoàn thành</div>
          </div>
          
          <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Công việc hoàn thành</div>
            <div className="text-lg font-bold text-slate-800">{stats.done || 0}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">/ {total} tổng số</div>
          </div>

          <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Công việc trễ hạn</div>
            <div className={`text-lg font-bold ${(stats.overdueTasks || 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {stats.overdueTasks || 0}
            </div>
            <div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-0.5">
              Cần xử lý ngay
            </div>
          </div>
          
          <div className="border border-amber-200 rounded-xl p-3 bg-amber-50 flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-amber-700 uppercase mb-1 flex items-center gap-1">
              <Flag className="w-3 h-3" /> Milestone kế tiếp
            </div>
            <div className="text-xs font-bold text-amber-900 leading-tight line-clamp-1">
              {stats.nextMilestone ? stats.nextMilestone.title : 'Chưa có'}
            </div>
            <div className="text-[10px] font-medium text-amber-700 mt-1">
              {stats.nextMilestone ? renderDaysLeft(stats.nextMilestone.end_date) : '-'}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
