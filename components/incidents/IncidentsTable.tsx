'use client'

import { useMemo } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatVietnamDate, formatVietnamTime } from '@/lib/utils'

interface IncidentsTableProps {
  incidents: any[]
  members?: any[]
  onIncidentClick: (incident: any) => void
  onIncidentUpdate?: (id: string, field: string, value: any) => void
  onDelete?: (id: string) => void
  canView?: boolean
  canEdit?: boolean
}

export function IncidentsTable({ incidents, members = [], onIncidentClick, onIncidentUpdate, onDelete, canView = true, canEdit = true }: IncidentsTableProps) {
  const router = useRouter()

  const displayIncidents = useMemo(() => {
    return [...incidents].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [incidents])

  const getSeverityStyle = (s: string) => {
    if (s === 'critical') return 'text-red-700 bg-red-50 border-red-200'
    if (s === 'high') return 'text-orange-700 bg-orange-50 border-orange-200'
    if (s === 'medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getSeverityText = (s: string) => {
    if (s === 'critical') return '🔴 Nghiêm trọng'
    if (s === 'high') return '🟠 Cao'
    if (s === 'medium') return '🟡 Trung bình'
    return '⚪ Thấp'
  }

  const getStatusStyle = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'new' || str === 'todo' || str.includes('chưa')) return 'text-slate-600 bg-slate-50 border-slate-200'
    if (str === '2' || str === 'investigating' || str === 'fixing' || str === 'in_progress' || str.includes('đang')) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'text-purple-600 bg-purple-50 border-purple-200'
    if (str === '4' || str === 'resolved' || str === 'done' || str === 'completed' || str === 'implemented' || str.includes('hoàn thành')) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (str === '5' || str === 'closed' || str === 'rejected' || str.includes('đóng')) return 'text-slate-500 bg-slate-100 border-slate-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getStatusText = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'new' || str === 'todo' || str.includes('chưa')) return 'Chưa thực hiện'
    if (str === '2' || str === 'investigating' || str === 'fixing' || str === 'in_progress' || str.includes('đang')) return 'Đang thực hiện'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'Chờ duyệt'
    if (str === '4' || str === 'resolved' || str === 'done' || str === 'completed' || str === 'implemented' || str.includes('hoàn thành')) return 'Hoàn thành'
    if (str === '5' || str === 'closed' || str === 'rejected' || str.includes('đóng')) return 'Đóng'
    return 'Chưa thực hiện'
  }

  const handleRowClick = (inc: any) => {
    // Navigate to the project task page
    const projectId = inc.project_id
    if (projectId) {
      router.push(`/dashboard/projects/${projectId}`)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Mã</th>
              <th className="px-6 py-4">Tiêu đề sự cố</th>
              <th className="px-6 py-4">Dự án</th>
              <th className="px-6 py-4">Bộ phận</th>
              <th className="px-6 py-4 text-center">Mức độ</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4">Nhân sự liên quan</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayIncidents.map((inc: any) => (
              <tr 
                key={inc.id} 
                className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                onClick={() => handleRowClick(inc)}
                title={inc.project_id ? `Nhấp để xem công việc trong dự án` : 'Chưa liên kết dự án'}
              >
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{inc.code || `INC-${String(inc.id).substring(0,3)}`}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{inc.title}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {(inc.projectName || inc.projects?.name || inc.project_name || 'P').charAt(0)}
                    </div>
                    <span className="font-medium text-slate-700">{inc.projectName || inc.projects?.name || inc.project_name || 'Chưa xác định'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-700">{inc.departments?.name || 'Chưa phân công'}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getSeverityStyle(inc.severity)}`}>
                    {getSeverityText(inc.severity)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(inc.status)}`}>
                    {getStatusText(inc.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0" title="Người phát hiện">
                        {(inc.reporter?.full_name || inc.reporter_name || 'U').charAt(0)}
                      </div>
                      <span className="text-[12px] font-medium text-slate-700">{inc.reporter?.full_name || inc.reporter_name || 'Chưa rõ'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-600 flex-shrink-0" title="Người thực hiện">
                        {inc.assignee ? inc.assignee.full_name.charAt(0) : '?'}
                      </div>
                      <span className="text-[12px] font-medium text-purple-700">{inc.assignee ? inc.assignee.full_name : 'Chưa phân công'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-700 font-semibold">
                    {formatVietnamDate(inc.created_at)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {formatVietnamTime(inc.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {inc.project_id && (
                      <button 
                        onClick={() => handleRowClick(inc)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem công việc trong dự án"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(inc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">Hiển thị 1 đến {displayIncidents.length} trong {displayIncidents.length} sự cố</p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1 text-sm text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">&lt;</button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg shadow-sm">1</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">2</button>
          <button className="px-3 py-1 text-sm text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">&gt;</button>
        </div>
        <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none">
          <option>10 / trang</option>
        </select>
      </div>
    </div>
  )
}
