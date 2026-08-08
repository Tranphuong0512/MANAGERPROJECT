'use client'

import { Eye, Edit2, Trash2 } from 'lucide-react'

interface ImprovementsTableProps {
  improvements: any[]
  members?: any[]
  onImprovementClick?: (imp: any) => void
  onImprovementUpdate?: (id: string, field: string, value: any) => void
  onDelete?: (id: string) => void
  canView?: boolean
  canEdit?: boolean
}

export function ImprovementsTable({ improvements, members = [], onImprovementClick, onImprovementUpdate, onDelete, canView = true, canEdit = true }: ImprovementsTableProps) {
  const getImpactStyle = (s: string) => {
    if (s === 'high') return 'text-red-700 bg-red-50 border-red-200'
    if (s === 'medium') return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getImpactText = (s: string) => {
    if (s === 'high') return 'Cao'
    if (s === 'medium') return 'Trung bình'
    return 'Thấp'
  }

  const getStatusStyle = (s: string) => {
    if (s === 'pending') return 'text-slate-600 bg-slate-50 border-slate-200'
    if (s === 'in_progress') return 'text-blue-600 bg-blue-50 border-blue-200'
    if (s === 'implemented') return 'text-green-600 bg-green-50 border-green-200'
    if (s === 'rejected') return 'text-red-600 bg-red-50 border-red-200'
    return 'text-slate-500 bg-slate-100 border-slate-200'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Mã</th>
              <th className="px-6 py-4">Nội dung cải tiến</th>
              <th className="px-6 py-4">Dự án</th>
              <th className="px-6 py-4 text-center">Tác động</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4">Nhân sự liên quan</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {improvements.map((imp: any) => (
              <tr 
                key={imp.id} 
                className="hover:bg-purple-50/50 transition-colors cursor-pointer group"
                onClick={() => onImprovementClick && onImprovementClick(imp)}
              >
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{imp.code || `IMP-${imp.id.substring(0,3)}`}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors">{imp.title}</span>
                  <div className="text-[10px] text-slate-500 max-w-[200px] truncate">{imp.description || imp.module}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {(imp.projectName || imp.projects?.name || 'P').charAt(0)}
                    </div>
                    <span className="font-medium text-slate-700">{imp.projectName || imp.projects?.name || 'Dự án'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  {onImprovementUpdate && canEdit && imp.status !== 'implemented' && imp.status !== 'rejected' ? (
                    <select
                      value={imp.impact_level || 'medium'}
                      onChange={(e) => onImprovementUpdate(imp.id, 'impact_level', e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getImpactStyle(imp.impact_level || 'medium')}`}
                    >
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getImpactStyle(imp.impact_level)}`}>
                      {getImpactText(imp.impact_level)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  {onImprovementUpdate && canEdit && imp.status !== 'implemented' && imp.status !== 'rejected' ? (
                    <select
                      value={imp.status}
                      onChange={(e) => onImprovementUpdate(imp.id, 'status', e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getStatusStyle(imp.status)}`}
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="in_progress">Đang thực hiện</option>
                      <option value="implemented">Đã áp dụng</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(imp.status)}`}>
                      {imp.status === 'pending' ? 'Chờ duyệt' : 
                       imp.status === 'in_progress' ? 'Đang thực hiện' :
                       imp.status === 'implemented' ? 'Đã áp dụng' : 'Từ chối'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0" title="Người đề xuất">
                        {(imp.reporter?.full_name || 'U').charAt(0)}
                      </div>
                      <span className="text-[12px] font-medium text-slate-700">{imp.reporter?.full_name || 'Chưa rõ'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-600 flex-shrink-0" title="Người thực hiện">
                        {imp.assignee ? imp.assignee.full_name.charAt(0) : '?'}
                      </div>
                      {onImprovementUpdate && canEdit && members.length > 0 && imp.status !== 'implemented' && imp.status !== 'rejected' ? (
                        <select
                          value={imp.assigned_to || ''}
                          onChange={(e) => onImprovementUpdate(imp.id, 'assigned_to', e.target.value)}
                          className="text-[12px] font-medium text-purple-700 bg-transparent border-b border-dashed border-purple-300 hover:border-purple-500 outline-none cursor-pointer p-0"
                        >
                          <option value="">Chưa phân công</option>
                          {members.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[12px] font-medium text-purple-700">{imp.assignee ? imp.assignee.full_name : 'Chưa phân công'}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-600 font-medium">
                    {imp.created_at ? new Date(imp.created_at).toLocaleDateString('vi-VN') : '--/--/----'}
                  </div>
                </td>
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canView && (
                      <button 
                        onClick={() => onImprovementClick && onImprovementClick(imp)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button 
                        onClick={() => onImprovementClick && onImprovementClick(imp)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(imp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {improvements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  Chưa có đề xuất cải tiến nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
