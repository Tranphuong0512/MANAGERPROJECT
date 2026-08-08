'use client'

import { Plus, Search, Filter, Calendar, Folder, User, Flag } from 'lucide-react'

interface TasksHeaderProps {
  onCreateClick: () => void
  canCreate?: boolean
}

export function TasksHeader({ onCreateClick, canCreate = true }: TasksHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý công việc</h1>
        <p className="text-sm text-slate-500">Theo dõi, phân công và kiểm soát tiến độ công việc theo thời gian thực.</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {canCreate && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo công việc mới
          </button>
        )}

        <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500">
          <option>Tất cả trạng thái</option>
          <option>Đang thực hiện</option>
          <option>Hoàn thành</option>
        </select>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <Folder className="w-4 h-4" />
          Tất cả dự án
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <Flag className="w-4 h-4" />
          Ưu tiên
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <User className="w-4 h-4" />
          Người phụ trách
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <Calendar className="w-4 h-4" />
          Thời gian
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm công việc..."
            className="w-48 h-[38px] pl-9 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
          />
        </div>
      </div>
    </div>
  )
}
