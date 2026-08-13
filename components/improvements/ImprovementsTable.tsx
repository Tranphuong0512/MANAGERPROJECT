'use client'

import { useMemo } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatVietnamDate, formatVietnamTime } from '@/lib/utils'

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
  const router = useRouter()

  const displayImprovements = useMemo(() => {
    return [...improvements].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [improvements])

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

  const getStatusStyle = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'pending' || str === 'todo' || str.includes('chưa')) return 'text-slate-600 bg-slate-50 border-slate-200'
    if (str === '2' || str === 'in_progress' || str === 'evaluating' || str.includes('đang')) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'text-purple-600 bg-purple-50 border-purple-200'
    if (str === '4' || str === 'implemented' || str === 'done' || str === 'approved' || str.includes('hoàn thành')) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (str === '5' || str === 'rejected' || str === 'closed' || str.includes('từ chối') || str.includes('đóng')) return 'text-slate-500 bg-slate-100 border-slate-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getStatusText = (s: string | number) => {
    const str = String(s || '').toLowerCase()
    if (str === '1' || str === 'pending' || str === 'todo' || str.includes('chưa')) return 'Chưa thực hiện'
    if (str === '2' || str === 'in_progress' || str === 'evaluating' || str.includes('đang')) return 'Đang thực hiện'
    if (str === '3' || str === 'review' || str.includes('chờ') || str.includes('duyệt')) return 'Chờ duyệt'
    if (str === '4' || str === 'implemented' || str === 'done' || str === 'approved' || str.includes('hoàn thành')) return 'Hoàn thành'
    if (str === '5' || str === 'rejected' || str === 'closed' || str.includes('từ chối') || str.includes('đóng')) return 'Đóng'
    return 'Chưa thực hiện'
  }

  const handleRowClick = (imp: any) => {
    const projectId = imp.project_id
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
            {displayImprovements.map((imp: any) => (
              <tr 
                key={imp.id} 
                className="hover:bg-purple-50/50 transition-colors cursor-pointer group"
                onClick={() => handleRowClick(imp)}
                title={imp.project_id ? `Nhấp để xem công việc trong dự án` : 'Chưa liên kết dự án'}
              >
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{imp.code || `IMP-${String(imp.id).substring(0,3)}`}</span>
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
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getImpactStyle(imp.impact_level)}`}>
                    {getImpactText(imp.impact_level)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(imp.status)}`}>
                    {getStatusText(imp.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0" title="Người đề xuất">
                        {(imp.reporter?.full_name || imp.reporter_name || 'U').charAt(0)}
                      </div>
                      <span className="text-[12px] font-medium text-slate-700">{imp.reporter?.full_name || imp.reporter_name || 'Chưa rõ'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-600 flex-shrink-0" title="Người thực hiện">
                        {imp.assignee ? imp.assignee.full_name.charAt(0) : '?'}
                      </div>
                      <span className="text-[12px] font-medium text-purple-700">{imp.assignee ? imp.assignee.full_name : 'Chưa phân công'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-700 font-semibold">
                    {formatVietnamDate(imp.created_at)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {formatVietnamTime(imp.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {imp.project_id && (
                      <button 
                        onClick={() => handleRowClick(imp)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Xem công việc trong dự án"
                      >
                        <ExternalLink className="w-4 h-4" />
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
