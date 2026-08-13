'use client'

import { Plus, Search, Calendar, Filter, Lightbulb, Bug } from 'lucide-react'

interface IncidentsHeaderProps {
  onCreateClick: () => void
  activeTab: 'incidents' | 'improvements'
  setActiveTab: (tab: 'incidents' | 'improvements') => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  severityFilter: string
  setSeverityFilter: (val: string) => void
  projectFilter: string
  setProjectFilter: (val: string) => void
  projects: { id: string, name: string }[]
  canCreate?: boolean
}

export function IncidentsHeader({ 
  onCreateClick, 
  activeTab, 
  setActiveTab,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  severityFilter,
  setSeverityFilter,
  projectFilter,
  setProjectFilter,
  projects,
  canCreate = true,
}: IncidentsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Sự cố & Cải tiến</h1>
        <p className="text-sm text-slate-500">Quản lý các sự cố phát sinh và đề xuất cải tiến cho hệ thống.</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl mr-2">
          <button 
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'incidents' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Bug className="w-4 h-4" />
            Sự cố & Lỗi
          </button>
          <button 
            onClick={() => setActiveTab('improvements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'improvements' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Lightbulb className="w-4 h-4" />
            Đề xuất Cải tiến
          </button>
        </div>

        {canCreate && (
          <button
            onClick={onCreateClick}
            className={`flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm ${activeTab === 'incidents' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'incidents' ? 'Ghi nhận sự cố' : 'Tạo đề xuất'}
          </button>
        )}

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500"
        >
          <option value="active">Đang xử lý (Đang thực hiện + Chờ duyệt)</option>
          <option value="all">Tất cả trạng thái</option>
          <option value="new">Chưa thực hiện</option>
          <option value="in_progress">Đang thực hiện</option>
          <option value="review">Chờ duyệt</option>
          <option value="done">Hoàn thành</option>
          <option value="closed">Đóng</option>
        </select>

        <select 
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500"
        >
          <option value="all">Tất cả mức độ</option>
          {activeTab === 'incidents' && <option value="critical">🔴 Nghiêm trọng</option>}
          <option value="high">🟠 Cao</option>
          <option value="medium">🟡 Trung bình</option>
          <option value="low">⚪ Thấp</option>
        </select>

        <select 
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:border-blue-500"
        >
          <option value="all">Tất cả dự án</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'incidents' ? "Tìm kiếm sự cố..." : "Tìm kiếm đề xuất..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-[38px] pl-9 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
          />
        </div>
      </div>
    </div>
  )
}
