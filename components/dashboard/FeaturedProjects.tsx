'use client'

import Link from 'next/link'
import { FolderOpen } from 'lucide-react'
import { PRIORITY_COLORS, TASK_STATUS_COLORS } from '@/lib/constants'

interface FeaturedProjectsProps {
  projects: any[]
}

export function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  // If no projects, show placeholders just for UI demonstration based on design
  const displayProjects = projects.length > 0 ? projects.slice(0, 4) : [
    { id: '1', name: 'Nâng cấp App Mobile', priority: 'high', progress: 78, deadline: '25/05/2024', members: 6 },
    { id: '2', name: 'Triển khai CRM', priority: 'critical', progress: 45, deadline: '15/06/2024', members: 5 },
    { id: '3', name: 'Website Doanh Nghiệp', priority: 'medium', progress: 60, deadline: '30/06/2024', members: 4 },
    { id: '4', name: 'Hệ thống ERP', priority: 'high', progress: 30, deadline: '20/07/2024', members: 7 },
  ]

  const getPriorityColor = (p: string) => {
    if (p === 'critical') return 'bg-orange-100 text-orange-600'
    if (p === 'high') return 'bg-red-100 text-red-600'
    if (p === 'medium') return 'bg-blue-100 text-blue-600'
    return 'bg-green-100 text-green-600'
  }

  const getProgressColor = (p: string) => {
    if (p === 'critical') return 'bg-orange-400'
    if (p === 'high') return 'bg-blue-600'
    if (p === 'medium') return 'bg-purple-500'
    return 'bg-blue-400'
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Dự án nổi bật</h2>
        <Link href="/dashboard/projects" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả dự án
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayProjects.map((project: any) => {
          const priorityClass = getPriorityColor(project.priority || 'medium')
          const progressClass = getProgressColor(project.priority || 'medium')
          
          return (
            <div key={project.id} className="border border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex gap-3 items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-[15px] leading-tight mb-1">{project.name}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityClass}`}>
                    Ưu tiên {project.priority === 'high' ? 'cao' : project.priority === 'critical' ? 'rất cao' : 'trung bình'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Tiến độ</span>
                  <span className="font-bold text-slate-700">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${progressClass}`} style={{ width: `${project.progress || 0}%` }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-2 border-t border-slate-50">
                <div className="flex items-center gap-1">
                  <span>Deadline</span>
                  <span className="font-medium text-slate-800">{project.deadline || 'Chưa có'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1.5">
                    {/* Dummy avatars for UI mockup */}
                    <div className="w-5 h-5 rounded-full bg-blue-100 border border-white"></div>
                    <div className="w-5 h-5 rounded-full bg-green-100 border border-white"></div>
                  </div>
                  <span>{project.members || 2} thành viên</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
