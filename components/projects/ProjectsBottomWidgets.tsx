'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'
import { VN_TIMEZONE, getVietnamTimeAgo } from '@/lib/utils'

export function ProjectsBottomWidgets() {
  const { activeOrganization } = useOrganization()
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [membersMap, setMembersMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!activeOrganization) return
    const loadData = async () => {
      try {
        const orgId = activeOrganization.id
        
        // 1. Load Projects
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name, start_date, end_date')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5)
        setProjects(projs || [])

        // 2. Load Tasks
        const { data: tsks } = await supabase
          .from('tasks')
          .select('*, projects!inner(organization_id, name, deleted_at)')
          .eq('projects.organization_id', orgId)
          .is('deleted_at', null)
          .is('projects.deleted_at', null)
        setTasks(tsks || [])

        // 3. Load Project History
        const { data: hist } = await supabase
          .from('project_history')
          .select('*, projects!inner(organization_id, name, deleted_at)')
          .eq('projects.organization_id', orgId)
          .is('projects.deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5)
        setActivities(hist || [])

        // 4. Load Members to map user_id -> full_name
        const { data: mems } = await supabase
          .from('organization_members')
          .select('user_id, profiles(full_name)')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          
        const mMap: Record<string, string> = {}
        if (mems) {
          mems.forEach((m: any) => {
            if (m.profiles?.full_name) {
              mMap[m.user_id] = m.profiles.full_name
            }
          })
        }
        setMembersMap(mMap)
      } catch (err) {
        console.error("Error loading widgets data", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [activeOrganization])

  // Process Tasks
  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed')

  // Process Deadline
  const getWeekDeadlines = () => {
    const now = new Date()
    // Lấy mốc 0h00 hôm nay theo giờ VN
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const todayMidnight = new Date(`${todayStr}T00:00:00+07:00`)
    const nextWeek = new Date(todayMidnight.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return tasks
      .filter(t => {
        if (!t.due_date) return false
        const d = new Date(t.due_date)
        return !isNaN(d.getTime()) && d >= todayMidnight && d <= nextWeek
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 4)
  }
  const deadlineTasks = getWeekDeadlines()

  // Helpers
  const formatShortDate = (d: string) => {
    if (!d) return '--/--'
    try {
      const date = new Date(d)
      if (isNaN(date.getTime())) return '--/--'
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: VN_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
      }).format(date)
    } catch {
      return '--/--'
    }
  }
  const getDayOfWeek = (d: string) => {
    if (!d) return ''
    try {
      const date = new Date(d)
      if (isNaN(date.getTime())) return ''
      const dayFormatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: VN_TIMEZONE,
        weekday: 'short',
      }).format(date)
      return dayFormatted.includes('CN') ? 'CN' : dayFormatted.replace('Th ', 'T').replace('Thứ ', 'T')
    } catch {
      return ''
    }
  }
  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }
  const timeAgo = (dateStr: string) => {
    return getVietnamTimeAgo(dateStr)
  }

  // Action mapping
  const getActionText = (act: string, field: string) => {
    if (act === 'UPDATE') {
      if (field === 'status') return 'đã cập nhật trạng thái'
      if (field === 'progress_percentage') return 'đã cập nhật tiến độ'
      return 'đã cập nhật thông tin'
    }
    if (act === 'INSERT') return 'đã tạo mới dự án'
    if (act === 'DELETE') return 'đã xóa dự án'
    return 'đã thực hiện thao tác'
  }

  const getActionColor = (index: number) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-pink-100 text-pink-700', 'bg-orange-100 text-orange-700', 'bg-green-100 text-green-700']
    return colors[index % colors.length]
  }
  const getDeadlineColor = (index: number) => {
    const colors = ['bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-slate-500']
    return colors[index % colors.length]
  }
  const getGanttColor = (index: number) => {
    const colors = ['bg-green-500', 'bg-blue-500', 'bg-orange-400', 'bg-slate-300', 'bg-purple-500']
    return colors[index % colors.length]
  }

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Đang tải dữ liệu...</div>
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
      {/* Kanban mini */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Kanban mini</h3>
          <span className="text-xs font-semibold text-blue-600 cursor-pointer">Xem thêm</span>
        </div>
        
        <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-hidden">
          {/* To Do List */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> To do
              </span>
              <span className="text-[10px] font-bold text-slate-400">{todoTasks.length}</span>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {todoTasks.slice(0, 5).map(t => (
                <div key={t.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2 mb-2">
                  <p className="text-[11px] font-medium text-slate-700 leading-tight truncate">{t.title}</p>
                  <div className="text-[10px] text-slate-400 mt-2">{formatShortDate(t.due_date || t.created_at)}</div>
                </div>
              ))}
              {todoTasks.length > 5 && <div className="text-[10px] text-slate-400 text-center py-1">+{todoTasks.length - 5} công việc</div>}
            </div>
          </div>
          
          {/* In Progress */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> In Progress
              </span>
              <span className="text-[10px] font-bold text-slate-400">{inProgressTasks.length}</span>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {inProgressTasks.slice(0, 5).map(t => (
                <div key={t.id} className="bg-orange-50/50 border border-orange-100 rounded-lg p-2 mb-2">
                  <p className="text-[11px] font-medium text-slate-700 leading-tight truncate">{t.title}</p>
                  <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                    {formatShortDate(t.due_date || t.created_at)}
                    {t.assigned_to && <div className="w-4 h-4 rounded-full bg-orange-200 flex items-center justify-center text-[7px] font-bold text-orange-700">{getInitials(membersMap[t.assigned_to])}</div>}
                  </div>
                </div>
              ))}
              {inProgressTasks.length > 5 && <div className="text-[10px] text-slate-400 text-center py-1">+{inProgressTasks.length - 5} công việc</div>}
            </div>
          </div>

          {/* Done */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Done
              </span>
              <span className="text-[10px] font-bold text-slate-400">{doneTasks.length}</span>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {doneTasks.slice(0, 5).map(t => (
                <div key={t.id} className="bg-green-50/50 border border-green-100 rounded-lg p-2 mb-2">
                  <p className="text-[11px] font-medium text-slate-700 leading-tight line-through truncate">{t.title}</p>
                  <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                    {formatShortDate(t.due_date || t.created_at)}
                  </div>
                </div>
              ))}
              {doneTasks.length > 5 && <div className="text-[10px] text-slate-400 text-center py-1">+{doneTasks.length - 5} công việc</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt mini */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Gantt timeline mini</h3>
          <span className="text-xs font-semibold text-blue-600 cursor-pointer">Xem thêm</span>
        </div>
        
        <div className="text-xs font-bold text-slate-700 mb-2">Các dự án hiện tại</div>
        <div className="flex text-[8px] font-medium text-slate-400 mb-2 border-b border-slate-100 pb-1">
          <div className="w-[100px]"></div>
          <div className="flex-1 flex justify-between px-1">
             <span>Tiến độ</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-3 justify-center overflow-y-auto pr-1">
          {projects.length === 0 && <div className="text-center text-xs text-slate-400">Chưa có dự án nào</div>}
          {projects.map((p, idx) => {
            const hasDates = p.start_date && p.end_date
            const s = new Date(p.start_date)
            const e = new Date(p.end_date)
            const now = new Date()
            
            // Simple visual calculation: just show a random offset if no dates, or full bar
            const left = hasDates ? Math.max(0, Math.min(80, ((now.getTime() - s.getTime()) / (e.getTime() - s.getTime())) * 100)) : 10
            const width = hasDates ? 100 - left : 80

            return (
              <div key={p.id} className="flex items-center">
                <div className="w-[100px] text-[10px] font-medium text-slate-600 truncate pr-2" title={p.name}>{p.name}</div>
                <div className="flex-1 relative h-4 bg-slate-50 rounded">
                  <div className={`absolute h-full rounded-md ${getGanttColor(idx)}`} style={{ left: `${Math.min(left, 50)}%`, width: `${Math.min(width, 100)}%` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lịch deadline */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Lịch deadline trong tuần</h3>
          <span className="text-xs font-semibold text-blue-600 cursor-pointer">Xem lịch đầy đủ</span>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {deadlineTasks.length === 0 && <div className="text-center text-xs text-slate-400 mt-4">Không có deadline trong 7 ngày tới</div>}
          {deadlineTasks.map((t, i) => (
            <div key={t.id} className="flex gap-3">
              <div className="flex flex-col items-center min-w-[32px]">
                <span className={`text-[10px] font-bold ${getDayOfWeek(t.due_date) === 'CN' ? 'text-red-500' : 'text-slate-500'}`}>{getDayOfWeek(t.due_date)}</span>
                <span className="text-xs font-semibold text-slate-700">{formatShortDate(t.due_date)}</span>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                <div className="flex flex-col mb-1">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 truncate" title={t.title}>
                    <div className={`w-1.5 h-1.5 rounded-full ${getDeadlineColor(i)}`}></div>
                    {t.title}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 pl-3 truncate">{t.projects?.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hoạt động gần đây */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Hoạt động dự án</h3>
          <span className="text-xs font-semibold text-blue-600 cursor-pointer">Xem tất cả</span>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {activities.length === 0 && <div className="text-center text-xs text-slate-400 mt-4">Chưa có hoạt động nào</div>}
          {activities.map((act, i) => {
            const userName = membersMap[act.changed_by] || 'Hệ thống'
            return (
              <div key={act.id} className="flex gap-3">
                <div className={`w-7 h-7 rounded-full font-bold text-[10px] flex items-center justify-center flex-shrink-0 ${getActionColor(i)}`}>
                  {getInitials(userName)}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-600 leading-tight">
                    <span className="font-bold text-slate-800">{userName}</span> {getActionText(act.action, act.field_name)}
                  </p>
                  <p className="text-[11px] font-semibold text-blue-600 truncate">{act.projects?.name}</p>
                </div>
                <span className="text-[9px] text-slate-400 whitespace-nowrap">{timeAgo(act.created_at)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
