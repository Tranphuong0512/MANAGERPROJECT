'use client'

import { Clock, Calendar, Wallet, PenSquare, Copy } from 'lucide-react'
import { useState } from 'react'
import { EditProjectDialog } from './EditProjectDialog'
import { usePermissions } from '@/hooks/usePermissions'

interface LeftSidebarProps {
  project: any
  progress: number
  formatCurrency: (amount: number) => string
  onProjectUpdated?: (updatedProject: any) => void
  onDuplicateProject?: () => void
}

export function ProjectLeftSidebar({ project, progress, formatCurrency, onProjectUpdated, onDuplicateProject }: Readonly<LeftSidebarProps>) {
  const [showEdit, setShowEdit] = useState(false)
  const { hasPermission } = usePermissions()
  const canEditProject = hasPermission('edit_projects')
  const canCreateProject = hasPermission('create_projects')

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-red-700 bg-red-100'
    if (p === 'medium') return 'text-amber-700 bg-amber-100'
    return 'text-green-700 bg-green-100'
  }

  const getPriorityText = (p: string) => {
    if (p === 'high') return 'Cao'
    if (p === 'medium') return 'Trung bình'
    return 'Thấp'
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-6 relative group">
      
      {/* 1. Tiến độ tổng thể */}
      <div className="flex items-center gap-4 min-w-[240px] border-r border-slate-100 pr-6 relative">
        <div className="flex items-center justify-center relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 flex items-center justify-center relative">
            <div 
              className="absolute inset-0 rounded-full border-[6px] border-blue-600 border-r-transparent border-t-transparent -rotate-45"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${progress > 50 ? '100% 0%, 100% 100%, 0% 100%, 0% 50%' : '100% 0%, 100% 50%'})`
              }}
            ></div>
            <div className="text-center z-10 flex flex-col items-center justify-center h-full pt-0.5">
              <span className="block text-lg font-bold text-slate-800 leading-none">
                {progress}%
              </span>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 leading-tight mb-1">Tiến độ tổng thể</h2>
          <p className="text-[10px] text-slate-500 font-medium">Hoàn thành đúng hạn</p>
        </div>
      </div>

      {/* 2 -> 5: Các thông tin khác */}
      <div className="flex-1 flex flex-row items-center w-full min-w-0 divide-x divide-slate-100">
        
        {/* 2. Thời gian */}
        <div className="flex items-center gap-3 w-1/4 pr-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Thời gian</div>
            <div className="text-sm font-bold text-slate-800 truncate">
              {project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : '---'} - {project.end_date ? new Date(project.end_date).toLocaleDateString('vi-VN') : '---'}
            </div>
          </div>
        </div>

        {/* 3. Ngân sách */}
        <div className="flex items-center gap-3 w-1/4 pl-4 pr-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Ngân sách</div>
            <div className="text-sm font-bold text-slate-800 truncate">{formatCurrency(project.budget || 0)}</div>
          </div>
        </div>

        {/* 4. Người phụ trách */}
        <div className="flex items-center gap-3 w-1/4 pl-4 pr-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.staff?.full_name || 'PM'}`} alt="PM" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Người phụ trách</div>
            <div className="text-sm font-bold text-slate-800 truncate">{project.staff?.full_name || 'Chưa phân công'}</div>
          </div>
        </div>

        {/* 5. Ưu tiên & Cập nhật */}
        <div className="flex flex-col justify-center w-1/4 pl-4 pr-12 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Ưu tiên:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getPriorityColor(project.priority)}`}>
              {getPriorityText(project.priority)}
            </span>
          </div>
          <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Cập nhật: {new Date(project.updated_at || project.created_at).toLocaleDateString('vi-VN')}
          </div>
        </div>

      </div>

      {/* Floating Actions on the right */}
      {(canEditProject || (onDuplicateProject && canCreateProject)) && (
        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {canEditProject && (
            <button 
              onClick={() => setShowEdit(true)}
              className="p-2 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-full shadow-sm"
              title="Sửa thông tin dự án"
            >
              <PenSquare className="w-4 h-4" />
            </button>
          )}
          {onDuplicateProject && canCreateProject && (
            <button 
              onClick={onDuplicateProject}
              className="p-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-full shadow-sm"
              title="Nhân bản dự án"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <EditProjectDialog 
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        project={project}
        organizationId={project.organization_id}
        onUpdated={(newProj) => {
          if (onProjectUpdated) onProjectUpdated(newProj)
        }}
      />
    </div>
  )
}
