'use client'

import Link from 'next/link'

interface ProjectHealthOverviewProps {
  projects: any[]
  incidents: any[]
}

export function ProjectHealthOverview({ projects, incidents }: ProjectHealthOverviewProps) {
  // Calculate health for each project based on incident count
  const getProjectHealth = (projectId: string) => {
    const projectIncidents = incidents.filter((inc: any) => inc.project_id === projectId)
    const unresolvedCount = projectIncidents.filter((inc: any) => 
      inc.status === 'new' || inc.status === 'investigating' || inc.status === 'fixing'
    ).length
    
    if (unresolvedCount >= 3) return { label: 'Nguy hiểm', color: 'bg-red-500', textColor: 'text-red-600', dot: '🔴' }
    if (unresolvedCount >= 1) return { label: 'Cảnh báo', color: 'bg-yellow-500', textColor: 'text-yellow-600', dot: '🟡' }
    return { label: 'Ổn định', color: 'bg-green-500', textColor: 'text-green-600', dot: '🟢' }
  }

  const getIncidentCount = (projectId: string) => {
    return incidents.filter((inc: any) => inc.project_id === projectId).length
  }

  const getUnresolvedCount = (projectId: string) => {
    return incidents.filter((inc: any) => 
      inc.project_id === projectId && 
      (inc.status === 'new' || inc.status === 'investigating' || inc.status === 'fixing')
    ).length
  }

  const displayProjects = projects

  const getStatusText = (s: string) => {
    if (s === 'active' || s === 'in_progress') return 'Đang triển khai'
    if (s === 'completed' || s === 'done') return 'Hoàn thành'
    if (s === 'planning') return 'Lên kế hoạch'
    return 'Lưu trữ'
  }

  const getStatusStyle = (s: string) => {
    if (s === 'active' || s === 'in_progress') return 'text-blue-600 bg-blue-50'
    if (s === 'completed' || s === 'done') return 'text-green-600 bg-green-50'
    if (s === 'planning') return 'text-orange-600 bg-orange-50'
    return 'text-slate-600 bg-slate-100'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-800">Sức khỏe dự án</h2>
        <Link href="/dashboard/projects" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          Xem tất cả →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3">Dự án</th>
              <th className="px-6 py-3 text-center">Trạng thái</th>
              <th className="px-6 py-3">Tiến độ</th>
              <th className="px-6 py-3 text-center">Sự cố</th>
              <th className="px-6 py-3 text-center">Chưa xử lý</th>
              <th className="px-6 py-3 text-center">Sức khỏe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayProjects.map((project: any) => {
              const health = getProjectHealth(project.id)
              const incCount = getIncidentCount(project.id)
              const unresolvedCount = getUnresolvedCount(project.id)

              return (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        {project.name?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <span className="font-bold text-slate-800">{project.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusStyle(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.progress_percentage || 0}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-8 text-right">{project.progress_percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="text-sm font-bold text-slate-700">{incCount}</span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`text-sm font-bold ${unresolvedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {unresolvedCount}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="text-lg">{health.dot}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
