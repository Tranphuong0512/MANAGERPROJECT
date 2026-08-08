'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MonitoringActivityProps {
  activities?: any[]
}

const COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-orange-100 text-orange-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600'
]

export const MonitoringActivity = React.memo(function MonitoringActivity({ activities = [] }: MonitoringActivityProps) {
  const router = useRouter()
  
  const displayActivities = activities.length > 0 ? activities : [
    {
      action_type: 'system',
      description: 'Hệ thống đang hoạt động bình thường',
      projects: null,
      user: { full_name: 'Hệ thống' },
      created_at: new Date().toISOString()
    }
  ]

  const getTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} giờ trước`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} ngày trước`
    
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-[380px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-slate-800">Hoạt động gần đây</h2>
        <Link href="/dashboard/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem tất cả</Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {displayActivities.map((act, i) => {
          const colorClass = COLORS[i % COLORS.length]
          const userName = act.user?.full_name || 'Hệ thống'
          const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
          const timeAgo = getTimeAgo(act.created_at)

          return (
            <div key={i} className="flex items-start gap-3 group">
              {act.user?.avatar_url ? (
                <img src={act.user.avatar_url} className="w-8 h-8 rounded-full shrink-0 object-cover mt-0.5" alt={userName} />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${colorClass}`}>
                  {initials}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-slate-600 leading-tight mb-0.5">
                  <span className="font-bold text-slate-800">{userName}</span>{' '}
                  {act.action_type === 'status_change' ? 'đã cập nhật trạng thái' : 
                   act.action_type === 'task_completed' ? 'đã hoàn thành công việc' :
                   act.action_type === 'incident_reported' ? 'đã ghi nhận sự cố mới trong' :
                   act.action_type === 'bug_fixed' ? 'đã khắc phục sự cố trong' : 'đã thực hiện thay đổi trong'}
                </p>
                
                {act.projects && (
                  <p 
                    onClick={() => router.push(`/dashboard/projects/${act.project_id}`)}
                    className="text-[12px] font-medium text-blue-600 hover:underline cursor-pointer truncate"
                  >
                    {act.projects.name}
                  </p>
                )}
                
                {act.description && !act.projects && (
                  <p className="text-[12px] font-medium text-blue-600 truncate">{act.description}</p>
                )}
              </div>
              
              <span className="text-[10px] text-slate-400 font-medium shrink-0 pt-0.5">{timeAgo}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
