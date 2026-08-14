'use client'

import { Plus, Search, Filter, Calendar, LayoutList, LayoutGrid, CalendarRange } from 'lucide-react'

interface ProjectsHeaderProps {
  onCreateClick: () => void
  viewMode: 'list' | 'board' | 'gantt'
  setViewMode: (mode: 'list' | 'board' | 'gantt') => void
  onExportExcel?: () => void
  onExportPDF?: () => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  canCreate?: boolean
  canExport?: boolean
  isPreparingReport?: boolean
}

export function ProjectsHeader({ 
  onCreateClick, 
  viewMode, 
  setViewMode, 
  onExportExcel, 
  onExportPDF,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  canCreate = false,
  canExport = false,
  isPreparingReport = false,
}: ProjectsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý dự án</h1>
        <p className="text-sm text-slate-500">Quản lý tổng thể các dự án, theo dõi tiến độ, ngân sách và nguồn lực.</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {canCreate && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo dự án mới
          </button>
        )}

        {canExport && onExportExcel && (
          <button
            onClick={onExportExcel}
            disabled={isPreparingReport}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isPreparingReport ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}
          >
            {isPreparingReport ? 'Đang xử lý...' : 'Xuất Excel'}
          </button>
        )}

        {canExport && onExportPDF && (
          <button
            onClick={onExportPDF}
            disabled={isPreparingReport}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isPreparingReport ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}`}
          >
            {isPreparingReport ? 'Đang xử lý...' : 'Xuất PDF'}
          </button>
        )}

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="planning">Lên kế hoạch</option>
          <option value="active">Đang thực hiện</option>
          <option value="completed">Hoàn thành</option>
          <option value="archived">Lưu trữ</option>
        </select>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm dự án..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-[38px] pl-9 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl ml-2">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutList className="w-4 h-4" />
            List
          </button>
          <button 
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button 
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'gantt' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CalendarRange className="w-4 h-4" />
            Gantt
          </button>
        </div>
      </div>
    </div>
  )
}
