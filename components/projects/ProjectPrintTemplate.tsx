'use client'

import React, { forwardRef } from 'react'
import { Calendar, CheckCircle2, ShieldAlert, TrendingUp, Users, AlertTriangle, Building2 } from 'lucide-react'

interface ProjectPrintTemplateProps {
  project: any
  stats: any
  fullData: {
    checklists: any[]
    incidents: any[]
    improvements: any[]
    members: any[]
  } | null
  selectedChecklistIds?: (string | number)[]
  includeMembers?: boolean
  includeIncidents?: boolean
  includeImprovements?: boolean
}

const getTaskStatusBadge = (status: string, isCompleted: boolean) => {
  const st = String(status || '').toLowerCase()
  if (st === 'done' || st === 'completed' || isCompleted) return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">Hoàn thành</span>;
  if (st === 'review' || st.includes('chờ') || st.includes('duyệt')) return <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">Chờ duyệt</span>;
  if (st === 'in_progress' || st.includes('đang')) return <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">Đang làm</span>;
  return <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold border border-slate-200">Chưa làm</span>;
}

const getIncidentSeverityBadge = (severity: string) => {
  if (severity === 'critical') return <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3"/> NGHIÊM TRỌNG</span>;
  if (severity === 'high') return <span className="text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded text-[11px]">CAO</span>;
  if (severity === 'medium') return <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded text-[11px]">TRUNG BÌNH</span>;
  return <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">THẤP</span>;
}

const getIncidentStatusBadge = (status: string) => {
  if (status === 'new') return <span className="text-rose-600 font-semibold text-xs">Mới</span>;
  if (status === 'investigating') return <span className="text-amber-600 font-semibold text-xs">Đang điều tra</span>;
  if (status === 'fixing') return <span className="text-blue-600 font-semibold text-xs">Đang sửa</span>;
  if (status === 'resolved') return <span className="text-emerald-600 font-semibold text-xs">Đã xử lý</span>;
  return <span className="text-slate-500 font-semibold text-xs">Đã đóng</span>;
}

const getImprovementStatusBadge = (status: string) => {
  if (status === 'new') return <span className="text-blue-600 font-semibold text-xs border border-blue-200 bg-blue-50 px-2 py-0.5 rounded">Mới</span>;
  if (status === 'evaluating') return <span className="text-amber-600 font-semibold text-xs border border-amber-200 bg-amber-50 px-2 py-0.5 rounded">Đang đánh giá</span>;
  if (status === 'approved') return <span className="text-emerald-600 font-semibold text-xs border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded">Đã duyệt</span>;
  if (status === 'implemented') return <span className="text-purple-600 font-semibold text-xs border border-purple-200 bg-purple-50 px-2 py-0.5 rounded">Đã áp dụng</span>;
  return <span className="text-slate-500 font-semibold text-xs border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">Từ chối</span>;
}

export const ProjectPrintTemplate = forwardRef<HTMLDivElement, ProjectPrintTemplateProps>(
  ({ project, stats, fullData, selectedChecklistIds, includeMembers = true, includeIncidents = true, includeImprovements = true }, ref) => {
    if (!project || !fullData) return <div ref={ref} className="p-8">Đang tải dữ liệu báo cáo...</div>

    const displayChecklists = fullData.checklists.filter((c) => {
      if (!selectedChecklistIds || selectedChecklistIds.length === 0) return true
      return selectedChecklistIds.includes(c.id) || selectedChecklistIds.map(String).includes(String(c.id))
    })

    return (
      <div ref={ref} className="print-report-container bg-white text-slate-800 p-8 max-w-[210mm] mx-auto min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: A4 portrait; margin: 12mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
            .print-avoid-break { page-break-inside: avoid; }
            .print-report-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              background-color: white !important;
              z-index: 999999 !important;
            }
            .no-print { display: none !important; }
          }
        `}} />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 text-white mb-6 shadow-md print-avoid-break relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium mb-3 backdrop-blur-sm border border-white/20">
                <Building2 className="w-3.5 h-3.5 text-blue-300" /> BÁO CÁO TIẾN ĐỘ DỰ ÁN
              </div>
              <h1 className="text-2xl font-black mb-1 tracking-tight">{project.name}</h1>
              <p className="text-blue-200 text-xs font-semibold flex items-center gap-2">
                Mã dự án: <span className="bg-black/30 px-2 py-0.5 rounded text-white font-mono">{project.code || project.id}</span>
                {project.company_name && (
                  <span className="bg-white/15 px-2 py-0.5 rounded text-white">Tổ chức: {project.company_name}</span>
                )}
              </p>
            </div>
            <div className="text-right bg-black/20 p-3.5 rounded-xl backdrop-blur-sm border border-white/10 min-w-[140px]">
              <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Ngày Xuất Báo Cáo</p>
              <p className="text-sm font-bold flex items-center justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                {new Date().toLocaleDateString('vi-VN')}
              </p>
              <div className="mt-2 pt-2 border-t border-white/10">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white">
                  {project.status === 'completed' ? 'ĐÃ HOÀN THÀNH' : 'ĐANG HOẠT ĐỘNG'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tổng quan */}
        <div className="print-avoid-break mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">I. TỔNG QUAN TIẾN ĐỘ</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Tiến độ chung</p>
              <p className="text-2xl font-black text-blue-600 leading-none">{stats?.progress || 0}%</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats?.progress || 0}%` }}></div>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Công việc hoàn thành</p>
              <p className="text-2xl font-black text-emerald-600 leading-none">{stats?.taskCompleted || 0} <span className="text-xs text-slate-400 font-semibold">/ {stats?.taskTotal || 0}</span></p>
              <p className="text-[10px] font-bold text-emerald-700 mt-1">Đã duyệt xong</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Công việc chờ duyệt</p>
              <p className="text-2xl font-black text-amber-600 leading-none">{stats?.taskReview || 0}</p>
              <p className="text-[10px] font-bold text-amber-700 mt-1">Cần duyệt bài</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Sự cố phát sinh</p>
              <p className="text-2xl font-black text-rose-600 leading-none">{stats?.incidentsTotal || 0}</p>
              <p className="text-[10px] font-bold text-rose-700 mt-1">Đã khắc phục: {stats?.incidentsFixed || 0}</p>
            </div>
          </div>
        </div>

        {/* Nhân sự */}
        {includeMembers && (
          <div className="print-avoid-break mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">II. ĐỘI NGŨ THỰC HIỆN</h3>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase">Họ tên nhân sự</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-36">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fullData.members.length > 0 ? fullData.members.map((m, i) => (
                    <tr key={m.id || m.user_id || `member-${i}`}>
                      <td className="py-2 px-3 text-center font-medium text-slate-500">{i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{(Array.isArray(m.profiles) ? m.profiles[0]?.full_name : m.profiles?.full_name) || m.staff?.full_name || 'Không rõ'}</td>
                      <td className="py-2 px-3">
                        {m.role === 'manager' ? (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[11px] font-bold">Quản lý dự án</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-semibold">Thành viên</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-4 text-center text-slate-400 italic">Chưa có thông tin nhân sự</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Danh mục công việc */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">III. CHI TIẾT DANH MỤC CÔNG VIỆC ({displayChecklists.length})</h3>
          </div>

          {displayChecklists.length > 0 ? displayChecklists.map((list, listIdx) => (
            <div key={list.id || `list-${listIdx}`} className="mb-5 print-avoid-break border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">{listIdx + 1}. {list.title}</h4>
                <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  {list.checklist_items?.length || 0} công việc
                </span>
              </div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 font-bold text-slate-600 uppercase w-10 text-center">STT</th>
                    <th className="py-2 px-3 font-bold text-slate-600 uppercase">Tên công việc</th>
                    <th className="py-2 px-3 font-bold text-slate-600 uppercase w-28">Trạng thái</th>
                    <th className="py-2 px-3 font-bold text-slate-600 uppercase w-36">Người phụ trách</th>
                    <th className="py-2 px-3 font-bold text-slate-600 uppercase w-24 text-center">Ngày bắt đầu</th>
                    <th className="py-2 px-3 font-bold text-slate-600 uppercase w-24 text-center">Hạn chót</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.checklist_items && list.checklist_items.length > 0 ? list.checklist_items.map((item: any, itemIdx: number) => (
                    <tr key={item.id || `item-${itemIdx}`}>
                      <td className="py-2 px-3 text-center font-medium text-slate-400">{itemIdx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{item.title}</td>
                      <td className="py-2 px-3">
                        {getTaskStatusBadge(item.status, item.is_completed)}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-medium">
                        {item.assignees_names || (Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name) || item.staff?.full_name || '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {item.start_date ? new Date(item.start_date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {item.end_date ? new Date(item.end_date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-3 text-center text-slate-400 italic">Chưa có công việc trong danh mục này</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
              Chưa chọn danh mục công việc nào để in.
            </div>
          )}
        </div>

        {/* Sự cố */}
        {includeIncidents && (
          <div className="print-avoid-break mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">IV. BÁO CÁO SỰ CỐ ({fullData.incidents.length})</h3>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase">Tên sự cố</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-28">Mức độ</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-24 text-center">Ngày báo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fullData.incidents.length > 0 ? fullData.incidents.map((inc, i) => (
                    <tr key={inc.id || `inc-${i}`}>
                      <td className="py-2 px-3 text-center font-medium text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{inc.title}</td>
                      <td className="py-2 px-3">{getIncidentSeverityBadge(inc.severity)}</td>
                      <td className="py-2 px-3">{getIncidentStatusBadge(inc.status)}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{inc.created_at ? new Date(inc.created_at).toLocaleDateString('vi-VN') : '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-4 text-center text-slate-400 italic">Chưa ghi nhận sự cố nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cải tiến */}
        {includeImprovements && (
          <div className="print-avoid-break mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">V. SÁNG KIẾN CẢI TIẾN ({fullData.improvements.length})</h3>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase">Nội dung sáng kiến</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-32">Trạng thái</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 uppercase w-36">Người đề xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fullData.improvements.length > 0 ? fullData.improvements.map((imp, i) => (
                    <tr key={imp.id || `imp-${i}`}>
                      <td className="py-2 px-3 text-center font-medium text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{imp.title}</td>
                      <td className="py-2 px-3">{getImprovementStatusBadge(imp.status)}</td>
                      <td className="py-2 px-3 text-slate-700 font-medium font-medium">
                        {(Array.isArray(imp.profiles) ? imp.profiles[0]?.full_name : imp.profiles?.full_name) || imp.reporter?.full_name || 'Không rõ'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-4 text-center text-slate-400 italic">Chưa ghi nhận sáng kiến nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    )
  }
)

ProjectPrintTemplate.displayName = 'ProjectPrintTemplate'
