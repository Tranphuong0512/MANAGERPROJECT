'use client'

import React, { forwardRef } from 'react'
import { Calendar, TrendingUp, Folder, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ProjectsListPrintTemplateProps {
  organization: any
  stats: any
  projects: any[]
}

export const ProjectsListPrintTemplate = forwardRef<HTMLDivElement, ProjectsListPrintTemplateProps>(
  ({ organization, stats, projects }, ref) => {
    if (!projects) return <div ref={ref} className="p-8">Đang tải dữ liệu báo cáo...</div>

    return (
      <div ref={ref} className="print-report-container bg-slate-50 text-slate-800 p-8 max-w-[297mm] mx-auto min-h-screen" style={{ fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: A4 landscape; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
            .print-page-break { page-break-before: always; }
            .print-avoid-break { page-break-inside: avoid; }
            .print-report-container { width: 100% !important; max-width: 100% !important; padding: 15mm !important; margin: 0 !important; box-shadow: none !important; }
            .no-print { display: none !important; }
          }
        `}} />
        
        {/* Header (Gradient & Modern) */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-700 rounded-2xl p-6 text-white mb-8 shadow-lg print-avoid-break relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium mb-3 backdrop-blur-sm border border-white/20">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> Báo cáo Tổng quan
              </div>
              <h1 className="text-3xl font-black mb-1 tracking-tight">DANH SÁCH TỔNG HỢP DỰ ÁN</h1>
              <p className="text-blue-200 font-medium flex items-center gap-2">
                Tổ chức: <span className="bg-black/20 px-2 py-0.5 rounded text-white">{organization?.name || 'Tất cả'}</span>
              </p>
            </div>
            <div className="text-right bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <p className="text-xs text-blue-200 uppercase font-bold tracking-wider mb-1">Ngày xuất báo cáo</p>
              <p className="text-lg font-bold flex items-center justify-end gap-2">
                <Calendar className="w-4 h-4 text-blue-300" />
                {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>

        {/* Tổng quan (Cards) */}
        <div className="print-avoid-break mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Thống kê chung</h3>
          </div>
          
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Tổng dự án</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-blue-600 leading-none">{stats?.totalProjects || 0}</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Đang triển khai</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-emerald-600 leading-none">{stats?.activeProjects || 0}</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Đã hoàn thành</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-purple-600 leading-none">{stats?.completedProjects || 0}</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Sự cố tồn đọng</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-rose-600 leading-none">{stats?.unresolvedIncidents || 0}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Tổng ngân sách</p>
              <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-800 leading-none">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.totalBudget || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách dự án */}
        <div className="print-page-break mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Chi tiết Dự án</h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider w-12 text-center">STT</th>
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider">Tên dự án</th>
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider">Mã</th>
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider">Trạng thái</th>
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider w-24">Tiến độ</th>
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider text-right">Ngân sách</th>
                  <th className="py-3 px-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider text-center">Sự cố</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.length > 0 ? projects.map((p, i) => {
                  const progress = p.progress_percentage || 0
                  
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 print-avoid-break">
                      <td className="py-3 px-4 text-center font-medium text-slate-400">{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                      <td className="py-3 px-4 font-medium text-slate-500">{p.code || `PRJ-${p.id.substring(0, 6)}`}</td>
                      <td className="py-3 px-4">
                        {p.status === 'active' || p.status === 'in_progress' ? <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-blue-100">Đang triển khai</span> :
                         p.status === 'completed' || p.status === 'done' ? <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-100">Hoàn thành</span> :
                         p.status === 'overdue' ? <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-rose-100">Trễ hạn</span> : 
                         <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-bold">Chưa bắt đầu</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-600">{progress}%</span>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.budget || 0)}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {p.incidents?.[0]?.count || 0}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={7} className="py-6 text-center text-slate-400 italic">Chưa có dự án nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
)

ProjectsListPrintTemplate.displayName = 'ProjectsListPrintTemplate'
