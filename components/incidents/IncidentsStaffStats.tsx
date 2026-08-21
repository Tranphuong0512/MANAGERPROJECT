'use client'

import { useMemo, useState } from 'react'
import { Users, UserCheck, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Activity, Sparkles, Calendar } from 'lucide-react'
import { formatVietnamDateTime, formatVietnamDate, formatVietnamTime, parseToVietnamDate } from '@/lib/utils'

interface IncidentsStaffStatsProps {
  incidents: any[]
  type?: 'incidents' | 'improvements'
}

export function IncidentsStaffStats({ incidents = [], type = 'incidents' }: IncidentsStaffStatsProps) {
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const isImprovement = type === 'improvements'

  // Normalize status helper
  const getStatusCategory = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'new' || str === 'todo' || str === 'pending' || str.includes('chưa')) return 'new'
    if (str === '2' || str === 'investigating' || str === 'fixing' || str === 'in_progress' || str === 'evaluating' || str.includes('đang')) return 'in_progress'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'review'
    if (str === '4' || str === 'resolved' || str === 'done' || str === 'completed' || str === 'implemented' || str === 'approved' || str.includes('hoàn thành')) return 'resolved'
    if (str === '5' || str === 'closed' || str === 'rejected' || str.includes('đóng')) return 'closed'
    return 'new'
  }

  // Filter items by time
  const filteredIncidents = useMemo(() => {
    if (timeFilter === 'all') return incidents

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    startOfWeek.setHours(0, 0, 0, 0)
    const weekTime = startOfWeek.getTime()

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return incidents.filter(inc => {
      if (!inc.created_at) return true
      const itemTime = parseToVietnamDate(inc.created_at)?.getTime() || 0
      if (timeFilter === 'today') return itemTime >= today
      if (timeFilter === 'week') return itemTime >= weekTime
      if (timeFilter === 'month') return itemTime >= startOfMonth
      return true
    })
  }, [incidents, timeFilter])

  // 1. Thống kê người đang xử lý (Assignees / Handlers)
  const handlersStats = useMemo(() => {
    const map = new Map<string, {
      id: string
      name: string
      department: string
      inProgressCount: number
      reviewCount: number
      newCount: number
      resolvedCount: number
      totalCount: number
    }>()

    filteredIncidents.forEach(inc => {
      const assigneeName = inc.assignee?.full_name || (inc.assigned_to ? `Nhân sự #${String(inc.assigned_to).replace('apec_', '')}` : 'Chưa phân công')
      const assigneeId = inc.assignee?.id || inc.assigned_to || 'unassigned'
      const deptName = inc.departments?.name || inc.assignee?.department_name || 'Chưa rõ phòng ban'

      if (!map.has(assigneeId)) {
        map.set(assigneeId, {
          id: assigneeId,
          name: assigneeName,
          department: deptName,
          inProgressCount: 0,
          reviewCount: 0,
          newCount: 0,
          resolvedCount: 0,
          totalCount: 0
        })
      }

      const item = map.get(assigneeId)!
      item.totalCount += 1

      const cat = getStatusCategory(inc.status)
      if (cat === 'in_progress') item.inProgressCount += 1
      else if (cat === 'review') item.reviewCount += 1
      else if (cat === 'new') item.newCount += 1
      else if (cat === 'resolved' || cat === 'closed') item.resolvedCount += 1
    })

    return Array.from(map.values())
      .sort((a, b) => (b.inProgressCount + b.reviewCount) - (a.inProgressCount + a.reviewCount) || b.totalCount - a.totalCount)
  }, [filteredIncidents])

  // 2. Thống kê người báo cáo / đề xuất (Reporters)
  const reportersStats = useMemo(() => {
    const map = new Map<string, {
      id: string
      name: string
      department: string
      totalReported: number
      inProgressReported: number
      resolvedReported: number
      latestIncident: string
      latestDate: string
    }>()

    filteredIncidents.forEach(inc => {
      const reporterName = inc.reporter?.full_name || inc.reporter_name || 'Chưa rõ'
      const reporterId = inc.reporter?.id || inc.reported_by || inc.reporter_id || reporterName
      const deptName = inc.reporter?.department_name || inc.departments?.name || 'Phòng ban'

      if (!map.has(reporterId)) {
        map.set(reporterId, {
          id: reporterId,
          name: reporterName,
          department: deptName,
          totalReported: 0,
          inProgressReported: 0,
          resolvedReported: 0,
          latestIncident: inc.title || '',
          latestDate: inc.created_at || ''
        })
      }

      const item = map.get(reporterId)!
      item.totalReported += 1

      const cat = getStatusCategory(inc.status)
      if (cat === 'in_progress' || cat === 'review' || cat === 'new') {
        item.inProgressReported += 1
      } else if (cat === 'resolved' || cat === 'closed') {
        item.resolvedReported += 1
      }

      if (inc.created_at && (!item.latestDate || new Date(inc.created_at) > new Date(item.latestDate))) {
        item.latestDate = inc.created_at
        item.latestIncident = inc.title || ''
      }
    })

    return Array.from(map.values())
      .sort((a, b) => b.totalReported - a.totalReported)
  }, [filteredIncidents])

  return (
    <div className="space-y-6 mb-8">
      {/* Tiêu đề khu vực thống kê nhân sự + Bộ lọc Ngày / Tuần / Tháng / Tất cả */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${isImprovement ? 'bg-purple-600' : 'bg-blue-600'} flex items-center justify-center text-white shadow-sm`}>
            {isImprovement ? <Sparkles className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isImprovement ? 'Thống kê Nhân sự & Khối lượng công việc Cải tiến' : 'Thống kê Nhân sự & Khối lượng công việc Sự cố'}
            </h2>
            <p className="text-xs text-slate-500">
              {isImprovement 
                ? 'Chi tiết người đang trực tiếp thực hiện và nhân sự đề xuất cải tiến' 
                : 'Chi tiết người đang trực tiếp xử lý và nhân sự ghi nhận báo cáo sự cố'}
            </p>
          </div>
        </div>

        {/* Bộ lọc thời gian */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${timeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1.5 rounded-lg transition-all ${timeFilter === 'today' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'}`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-3 py-1.5 rounded-lg transition-all ${timeFilter === 'week' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'}`}
          >
            Tuần này
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${timeFilter === 'month' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'}`}
          >
            Tháng này
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card 1: Người đang xử lý / thực hiện */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isImprovement ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isImprovement ? 'Người đang thực hiện cải tiến' : 'Người đang xử lý sự cố'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isImprovement 
                      ? 'Theo dõi số lượng đề xuất cải tiến đang thực hiện của từng nhân sự' 
                      : 'Theo dõi số lượng sự cố đang thực hiện của từng nhân sự'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold ${isImprovement ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-blue-700 bg-blue-50 border-blue-200'} px-3 py-1 rounded-full border`}>
                {handlersStats.length} nhân sự
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-y border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Nhân viên thực hiện</th>
                    <th className={`py-3 px-2 text-center ${isImprovement ? 'text-purple-700 bg-purple-50/50' : 'text-blue-700 bg-blue-50/50'} font-extrabold`}>Đang thực hiện</th>
                    <th className="py-3 px-2 text-center text-purple-700">Chờ duyệt</th>
                    <th className="py-3 px-2 text-center text-emerald-700">Hoàn thành</th>
                    <th className="py-3 px-2 text-center">Tổng số</th>
                    <th className="py-3 px-3 text-right">Tỷ lệ xong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {handlersStats.map((h) => {
                    const completionRate = h.totalCount > 0 ? Math.round((h.resolvedCount / h.totalCount) * 100) : 0
                    
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full ${isImprovement ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                              {h.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">{h.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{h.department}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-2 text-center ${isImprovement ? 'bg-purple-50/30' : 'bg-blue-50/30'}`}>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-extrabold text-xs ${
                            h.inProgressCount > 0 
                              ? (isImprovement ? 'bg-purple-600 text-white shadow-xs animate-pulse' : 'bg-blue-600 text-white shadow-xs animate-pulse') 
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {h.inProgressCount}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-semibold text-purple-700">{h.reviewCount}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-semibold text-emerald-700">{h.resolvedCount}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {h.totalCount}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-600 text-[11px] w-7 text-right">{completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {handlersStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        {isImprovement ? 'Chưa có dữ liệu người thực hiện cải tiến.' : 'Chưa có dữ liệu người xử lý sự cố.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 2: Người báo cáo / đề xuất */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                  {isImprovement ? <Sparkles className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isImprovement ? 'Người đề xuất cải tiến' : 'Người báo cáo sự cố'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isImprovement 
                      ? 'Danh sách nhân sự tích cực đóng góp sáng kiến & đề xuất cải tiến' 
                      : 'Danh sách nhân sự tích cực ghi nhận & phát hiện sự cố'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                {reportersStats.length} {isImprovement ? 'người đề xuất' : 'người báo cáo'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-y border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">{isImprovement ? 'Người đề xuất' : 'Người báo cáo'}</th>
                    <th className="py-3 px-2 text-center">Tổng {isImprovement ? 'đề xuất' : 'báo cáo'}</th>
                    <th className="py-3 px-2 text-center text-blue-700">Đang xử lý</th>
                    <th className="py-3 px-2 text-center text-emerald-700">{isImprovement ? 'Đã áp dụng' : 'Đã xong'}</th>
                    <th className="py-3 px-3 text-right">{isImprovement ? 'Đề xuất gần nhất' : 'Sự cố gần nhất'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportersStats.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {r.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{r.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{r.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700">
                          {r.totalReported}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-semibold text-blue-700">{r.inProgressReported}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-semibold text-emerald-700">{r.resolvedReported}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-medium text-slate-700 truncate max-w-[150px] ml-auto">{r.latestIncident || '---'}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.latestDate ? formatVietnamDateTime(r.latestDate) : ''}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reportersStats.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        {isImprovement ? 'Chưa có dữ liệu người đề xuất.' : 'Chưa có dữ liệu người báo cáo.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
