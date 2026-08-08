'use client'

import { X, Calendar, Wallet, AlertTriangle, FileText } from 'lucide-react'
import { ProjectChecklistAccordion } from './ProjectChecklistAccordion'

interface ProjectSlideOverProps {
  project: any | null
  onClose: () => void
}

export function ProjectSlideOver({ project, onClose }: ProjectSlideOverProps) {
  if (!project) return null

  const formatCurrency = (amount: number) => {
    if (!amount) return '0đ'
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800">Chi tiết dự án</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl shadow-sm">
                {project.name ? project.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{project.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500">{project.code || `PRJ-${project.id.substring(0,6)}`}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100">
                    Đang thực hiện
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              Dự án nâng cấp ứng dụng di động với các tính năng mới, cải thiện hiệu năng và trải nghiệm người dùng.
            </p>
          </div>

          {/* Progress Donut & Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col items-center justify-center relative">
              {/* Fake donut chart with CSS */}
              <div className="w-24 h-24 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
                <div 
                  className="absolute inset-0 rounded-full border-8 border-blue-600 border-r-transparent border-t-transparent -rotate-45"
                ></div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-slate-800">78%</span>
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Hoàn thành</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-1 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold">Thời gian</span>
                </div>
                <div className="text-[13px] font-bold text-slate-800">{project.startDate || '01/05/2026'} - {project.endDate || '30/06/2026'}</div>
                <div className="text-[11px] text-blue-600 font-medium mt-1">Còn 25 ngày</div>
              </div>
              
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-1 text-slate-500">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-semibold">Ngân sách</span>
                </div>
                <div className="text-sm font-bold text-slate-800">{formatCurrency(project.budget || 350000000)}</div>
                <div className="text-[11px] text-slate-500 mt-1">Đã dùng 273,000,000đ (78%)</div>
              </div>
            </div>
          </div>

          {/* Checklist & Công việc */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800">Checklist & Công việc</h3>
            </div>
            <ProjectChecklistAccordion projectId={project.id} organizationId={project.organization_id} />
          </div>

          {/* Rủi ro / Cảnh báo */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-orange-700 mb-1">Rủi ro / Cảnh báo</h4>
              <p className="text-xs text-orange-600">Tiến độ kiểm thử chậm hơn kế hoạch 3 ngày.</p>
            </div>
          </div>

          {/* Tài liệu liên quan */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Tài liệu liên quan</h3>
              <span className="text-xs font-semibold text-blue-600 cursor-pointer">Xem tất cả</span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2">
              <div className="min-w-[120px] bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col gap-2">
                <FileText className="w-6 h-6 text-red-500" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">Yêu cầu tính năng v2.1</p>
                  <p className="text-[10px] text-slate-500">2.4 MB</p>
                </div>
              </div>
              <div className="min-w-[120px] bg-purple-50 border border-purple-100 rounded-xl p-3 flex flex-col gap-2">
                <FileText className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">Thiết kế UI/UX.fig</p>
                  <p className="text-[10px] text-slate-500">18.6 MB</p>
                </div>
              </div>
              <div className="min-w-[120px] bg-green-50 border border-green-100 rounded-xl p-3 flex flex-col gap-2">
                <FileText className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">Kế hoạch dự án.xlsx</p>
                  <p className="text-[10px] text-slate-500">1.2 MB</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
