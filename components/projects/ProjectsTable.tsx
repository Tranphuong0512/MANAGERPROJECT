'use client'

import { useState } from 'react'
import { Eye, Edit2, Trash2, Bug, Lightbulb, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProjectsTableProps {
  projects: any[]
  onProjectClick?: (project: any) => void
  onEditClick?: (project: any) => void
  onDeleteClick?: (project: any) => void
  onStatusChange?: (project: any, newStatus: string) => void
  searchQuery?: string
  viewMode?: string
  canView?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function ProjectsTable({ 
  projects, 
  searchQuery, 
  viewMode,
  onProjectClick,
  onEditClick,
  onDeleteClick,
  onStatusChange,
  canView = true,
  canEdit = true,
  canDelete = true,
}: ProjectsTableProps) {
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null)
  const router = useRouter()
  const displayProjects = projects

  const formatCurrency = (amount: number) => {
    if (!amount) return '0đ'
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
  }

  const getPriorityStyle = (p: string) => {
    if (p === 'critical' || p === 'high') return 'text-red-600 bg-red-50 border-red-100'
    if (p === 'medium') return 'text-orange-600 bg-orange-50 border-orange-100'
    return 'text-green-600 bg-green-50 border-green-100'
  }

  const getPriorityText = (p: string) => {
    if (p === 'critical' || p === 'high') return 'Cao'
    if (p === 'medium') return 'Trung bình'
    return 'Thấp'
  }

  const getStatusStyle = (s: string) => {
    if (s === 'active' || s === 'in_progress') return 'text-blue-600 bg-blue-50'
    if (s === 'completed' || s === 'done') return 'text-green-600 bg-green-50'
    if (s === 'overdue') return 'text-red-600 bg-red-50'
    if (s === 'paused') return 'text-orange-600 bg-orange-50'
    return 'text-slate-600 bg-slate-100'
  }
  
  const getStatusText = (s: string) => {
    if (s === 'active' || s === 'in_progress') return 'Đang thực hiện'
    if (s === 'completed' || s === 'done') return 'Hoàn thành'
    if (s === 'overdue') return 'Quá hạn'
    if (s === 'paused') return 'Tạm dừng'
    return 'Chưa bắt đầu'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 w-[220px] max-w-[220px]">Dự án</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4">Khách hàng / Phòng ban</th>
              <th className="px-6 py-4">Trưởng dự án</th>
              <th className="px-6 py-4">Thành viên</th>
              <th className="px-6 py-4">Ưu tiên</th>
              <th className="px-6 py-4">Tiến độ</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4 text-right">Ngân sách</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayProjects.map((project: any) => (
              <tr 
                key={project.id} 
                className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <td className="px-6 py-4 w-[220px] max-w-[220px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                      {project.name ? project.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate" title={project.name}>{project.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{project.code || `PRJ-${project.id.substring(0,6)}`}</span>
                        {(project.incidents?.[0]?.count > 0 || project.improvements?.[0]?.count > 0) && (
                          <div className="flex items-center gap-1.5">
                            {project.incidents?.[0]?.count > 0 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded" title={`${project.incidents[0].count} Sự cố`}>
                                <Bug className="w-2.5 h-2.5" />
                                {project.incidents[0].count}
                              </span>
                            )}
                            {project.improvements?.[0]?.count > 0 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded" title={`${project.improvements[0].count} Cải tiến`}>
                                <Lightbulb className="w-2.5 h-2.5" />
                                {project.improvements[0].count}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center relative">
                  <div className="inline-block relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenStatusDropdown(openStatusDropdown === project.id ? null : project.id);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition-all ${getStatusStyle(project.status)}`}
                    >
                      {getStatusText(project.status)}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {openStatusDropdown === project.id && (
                      <>
                        <div className="fixed inset-0 z-[70]" onClick={(e) => { e.stopPropagation(); setOpenStatusDropdown(null); }} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-[80] min-w-[160px] animate-in fade-in slide-in-from-top-1">
                          {[
                            { value: 'active', label: 'Đang thực hiện', color: 'text-blue-600 bg-blue-50' },
                            { value: 'completed', label: 'Hoàn thành', color: 'text-green-600 bg-green-50' },
                            { value: 'paused', label: 'Tạm dừng', color: 'text-orange-600 bg-orange-50' },
                            { value: 'overdue', label: 'Quá hạn', color: 'text-red-600 bg-red-50' },
                            { value: 'planning', label: 'Chưa bắt đầu', color: 'text-slate-600 bg-slate-100' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange?.(project, opt.value);
                                setOpenStatusDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                                project.status === opt.value ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${opt.color.split(' ')[1]}`} />
                              <span className={opt.color.split(' ')[0]}>{opt.label}</span>
                              {project.status === opt.value && <span className="ml-auto text-blue-500">✓</span>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-700 font-medium">{project.client || 'Nội bộ'}</div>
                  <div className="text-xs text-slate-500">{project.department || 'Chung'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const managerName = project.staff?.full_name || project.manager_name || project.manager || project.leader || (project.manager_id ? `PM (${project.manager_id})` : 'Chưa gán');
                      const initial = (managerName && managerName !== 'Chưa gán' ? managerName : 'A').charAt(0).toUpperCase();
                      const isAssigned = managerName && managerName !== 'Chưa gán';
                      return (
                        <>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isAssigned ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                            {initial}
                          </div>
                          <span className={`font-medium ${isAssigned ? 'text-slate-700' : 'text-slate-400 italic'}`}>{managerName}</span>
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex -space-x-2 mr-2">
                      {(() => {
                        const members: any[] = [];
                        if (project.staff) {
                          members.push({ profiles: project.staff });
                        }
                        if (project.project_members) {
                          project.project_members.forEach((pm: any) => {
                            const name = Array.isArray(pm.profiles) ? pm.profiles[0]?.full_name : pm.profiles?.full_name;
                            const managerName = Array.isArray(project.staff) ? project.staff[0]?.full_name : project.staff?.full_name;
                            if (name && name !== managerName) {
                              members.push(pm);
                            }
                          });
                        }

                        if (members.length > 0) {
                          return (
                            <>
                              {members.slice(0, 3).map((pm: any, idx: number) => {
                                const name = Array.isArray(pm.profiles) ? pm.profiles[0]?.full_name : pm.profiles?.full_name;
                                if (!name) return null;
                                const initial = name.charAt(0).toUpperCase();
                                const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700'];
                                return (
                                  <div key={idx} className={`w-7 h-7 rounded-full ${colors[idx % colors.length]} border-2 border-white flex justify-center items-center text-[10px] font-bold z-${30 - idx * 10}`} title={name}>
                                    {initial}
                                  </div>
                                );
                              })}
                              {members.length > 3 && (
                                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex justify-center items-center text-[10px] font-bold text-slate-600 z-0">
                                  +{members.length - 3}
                                </div>
                              )}
                              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 ml-2">
                                {members.length}
                              </span>
                            </>
                          );
                        } else {
                          return <span className="text-xs text-slate-400 italic">Chưa có</span>;
                        }
                      })()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getPriorityStyle(project.priority)}`}>
                    {getPriorityText(project.priority)}
                  </span>
                </td>
                <td className="px-6 py-4 w-32">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold text-slate-700">
                    <span>{project.progress_percentage || project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${project.progress_percentage || project.progress || 0}%` }}></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-600 font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : (project.startDate || '--/--/----')}</div>
                  <div className="text-xs text-slate-400">{project.end_date ? new Date(project.end_date).toLocaleDateString('vi-VN') : (project.endDate || '--/--/----')}</div>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-700">
                  {formatCurrency(project.budget || 100000000)}
                </td>

                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canView && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/${project.id}`) }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditClick?.(project) }}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" 
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteClick?.(project) }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">Hiển thị 1 đến {displayProjects.length} trong {displayProjects.length} dự án</p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1 text-sm text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">&lt;</button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg shadow-sm">1</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">2</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">3</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">4</button>
          <button className="px-3 py-1 text-sm text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">&gt;</button>
        </div>
        <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none">
          <option>10 / trang</option>
        </select>
      </div>
    </div>
  )
}
