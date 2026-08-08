'use client'

import { Eye, Edit2, Trash2 } from 'lucide-react'

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
  const displayIncidents = incidents

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

  const getStatusStyle = (s: string) => {
    if (s === 'new') return 'text-red-600 bg-red-50 border-red-100'
    if (s === 'investigating') return 'text-orange-600 bg-orange-50 border-orange-100'
    if (s === 'fixing') return 'text-blue-600 bg-blue-50 border-blue-100'
    if (s === 'resolved') return 'text-green-600 bg-green-50 border-green-100'
    return 'text-slate-500 bg-slate-100 border-slate-200'
  }

  const getStatusText = (s: string) => {
    if (s === 'new') return 'Mới phát sinh'
    if (s === 'investigating') return 'Đang điều tra'
    if (s === 'fixing') return 'Đang sửa'
    if (s === 'resolved') return 'Đã khắc phục'
    return 'Đã đóng'
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
                onClick={() => onIncidentClick(inc)}
              >
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{inc.code || `INC-${inc.id.substring(0,3)}`}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{inc.title}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {(inc.projectName || inc.projects?.name || 'P').charAt(0)}
                    </div>
                    <span className="font-medium text-slate-700">{inc.projectName || inc.projects?.name || 'Dự án'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  {onIncidentUpdate && inc.status !== 'resolved' && inc.status !== 'closed' ? (
                    <select
                      value={inc.severity || 'medium'}
                      onChange={(e) => onIncidentUpdate(inc.id, 'severity', e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getSeverityStyle(inc.severity || 'medium')}`}
                    >
                      <option value="critical">Nghiêm trọng</option>
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getSeverityStyle(inc.severity)}`}>
                      {getSeverityText(inc.severity)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  {onIncidentUpdate && inc.status !== 'resolved' && inc.status !== 'closed' ? (
                    <select
                      value={inc.status}
                      onChange={(e) => onIncidentUpdate(inc.id, 'status', e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getStatusStyle(inc.status)}`}
                    >
                      <option value="new">Mới phát sinh</option>
                      <option value="investigating">Đang điều tra</option>
                      <option value="fixing">Đang sửa</option>
                      <option value="resolved">Đã khắc phục</option>
                      <option value="closed">Đã đóng</option>
                    </select>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(inc.status)}`}>
                      {getStatusText(inc.status)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0" title="Người báo cáo">
                        {(inc.reporter?.full_name || 'U').charAt(0)}
                      </div>
                      <span className="text-[12px] font-medium text-slate-700">{inc.reporter?.full_name || 'Chưa rõ'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-600 flex-shrink-0" title="Người thực hiện">
                        {inc.assignee ? inc.assignee.full_name.charAt(0) : '?'}
                      </div>
                      {onIncidentUpdate && members.length > 0 && inc.status !== 'resolved' && inc.status !== 'closed' ? (
                        <select
                          value={inc.assigned_to || ''}
                          onChange={(e) => onIncidentUpdate(inc.id, 'assigned_to', e.target.value)}
                          className="text-[12px] font-medium text-purple-700 bg-transparent border-b border-dashed border-purple-300 hover:border-purple-500 outline-none cursor-pointer p-0"
                        >
                          <option value="">Chưa phân công</option>
                          {members.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[12px] font-medium text-purple-700">{inc.assignee ? inc.assignee.full_name : 'Chưa phân công'}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-600 font-medium">
                    {inc.created_at ? new Date(inc.created_at).toLocaleDateString('vi-VN') : '--/--/----'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {inc.created_at ? new Date(inc.created_at).toLocaleTimeString('vi-VN') : ''}
                  </div>
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canView && (
                      <button 
                        onClick={() => onIncidentClick(inc)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button 
                        onClick={() => onIncidentClick(inc)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
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
