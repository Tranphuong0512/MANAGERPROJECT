'use client'

import { Plus, Search, Building2, Briefcase, Calendar, Users, MapPin, Network, LayoutList } from 'lucide-react'

interface MembersHeaderProps {
  onCreateClick: () => void
}

export function MembersHeader({ onCreateClick }: MembersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý nhân sự</h1>
        <p className="text-sm text-slate-500">Theo dõi hồ sơ nhân viên, chấm công, hiệu suất, tuyển dụng và nghỉ phép trong cùng một hệ thống.</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm nhân sự mới
        </button>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <Building2 className="w-4 h-4" />
          Tất cả phòng ban
        </div>

        <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500">
          <option>Tất cả trạng thái</option>
          <option>Đang làm việc</option>
          <option>Thử việc</option>
        </select>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <Briefcase className="w-4 h-4" />
          Vị trí
        </div>

        <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500">
          <option>Chi nhánh</option>
          <option>Hà Nội</option>
          <option>TP. HCM</option>
        </select>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
          <Calendar className="w-4 h-4" />
          Thời gian
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm nhân viên..."
            className="w-48 h-[38px] pl-9 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl ml-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white shadow-sm text-blue-600 transition-colors">
            <LayoutList className="w-4 h-4" />
            Danh sách
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <Network className="w-4 h-4" />
            Sơ đồ
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <Calendar className="w-4 h-4" />
            Lịch
          </button>
        </div>
      </div>
    </div>
  )
}
