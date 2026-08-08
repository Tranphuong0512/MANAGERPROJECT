'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Calendar, Users, AlertTriangle, Bug, Lightbulb } from 'lucide-react'

interface ProjectsBoardProps {
  projects: any[]
  onStatusChange: (projectId: string, newStatus: string) => void
}

const STATUS_COLUMNS = [
  { id: 'planning', title: 'Lên kế hoạch', color: 'border-orange-200 bg-orange-50 text-orange-700' },
  { id: 'active', title: 'Đang thực hiện', color: 'border-blue-200 bg-blue-50 text-blue-700' },
  { id: 'paused', title: 'Tạm dừng', color: 'border-slate-200 bg-slate-100 text-slate-700' },
  { id: 'completed', title: 'Hoàn thành', color: 'border-green-200 bg-green-50 text-green-700' }
]

function ProjectCard({ project }: { project: any }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: {
      type: 'Project',
      project
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative"
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
          {project.name}
        </h4>
        <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPriorityStyle(project.priority || 'medium')}`}>
          {getPriorityText(project.priority || 'medium')}
        </span>
        <span className="text-[10px] font-medium text-slate-500">
          {project.code || `PRJ-${project.id.substring(0, 6)}`}
        </span>
        {(project.incidents?.[0]?.count > 0 || project.improvements?.[0]?.count > 0) && (
          <div className="flex items-center gap-1.5 ml-auto">
            {project.incidents?.[0]?.count > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded" title={`${project.incidents[0].count} Sự cố`}>
                <Bug className="w-2.5 h-2.5" />
                {project.incidents[0].count}
              </span>
            )}
            {project.improvements?.[0]?.count > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded" title={`${project.improvements[0].count} Cải tiến`}>
                <Lightbulb className="w-2.5 h-2.5" />
                {project.improvements[0].count}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 font-medium">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        {project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : '--'} - {project.end_date ? new Date(project.end_date).toLocaleDateString('vi-VN') : '--'}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-slate-600">Tiến độ</span>
          <span className="font-bold text-slate-800">{project.progress_percentage || 0}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.progress_percentage || 0}%` }}></div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center -space-x-2">
          {/* Manager avatar */}
          <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600 shadow-sm z-10" title="Quản lý dự án">
            {(project.staff?.full_name || project.manager || 'A').charAt(0)}
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-400 shadow-sm z-0">
            <Users className="w-3 h-3" />
          </div>
        </div>
        
        {project.status === 'overdue' && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            <AlertTriangle className="w-3 h-3" /> Quá hạn
          </div>
        )}
      </div>
    </div>
  )
}

import { useDroppable } from '@dnd-kit/core'

function Column({ col, projects }: { col: any, projects: any[] }) {
  const { setNodeRef } = useDroppable({
    id: col.id,
    data: {
      type: 'Column',
      col
    }
  })

  return (
    <div className="flex flex-col bg-slate-50 rounded-2xl min-h-[500px]">
      <div className={`px-4 py-3 border-b-2 rounded-t-2xl flex items-center justify-between ${col.color}`}>
        <h3 className="font-bold text-sm">{col.title}</h3>
        <span className="text-xs font-bold bg-white/50 px-2 py-0.5 rounded-full">{projects.length}</span>
      </div>
      
      <div ref={setNodeRef} className="p-3 flex-1 flex flex-col gap-3">
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export function ProjectsBoard({ projects, onStatusChange }: ProjectsBoardProps) {
  const [activeProject, setActiveProject] = useState<any | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const project = projects.find(p => p.id === active.id)
    setActiveProject(project || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProject(null)

    if (!over) return

    const activeProject = projects.find(p => p.id === active.id)
    if (!activeProject) return

    // Find which column it was dropped into
    // We are dropping on another project, so find that project's status
    const overProject = projects.find(p => p.id === over.id)
    let targetStatus = activeProject.status

    if (overProject) {
      // Treat specific sub-statuses as main columns
      let overStatus = overProject.status
      if (overStatus === 'in_progress') overStatus = 'active'
      if (overStatus === 'done') overStatus = 'completed'
      
      targetStatus = overStatus
    } else if (over.data?.current?.type === 'Column') {
      targetStatus = over.id as string
    }

    if (targetStatus !== activeProject.status) {
      onStatusChange(activeProject.id, targetStatus)
    }
  }

  const getColumnStatus = (status: string) => {
    if (status === 'in_progress') return 'active'
    if (status === 'done') return 'completed'
    return status || 'planning'
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {STATUS_COLUMNS.map(col => {
          const colProjects = projects.filter(p => getColumnStatus(p.status) === col.id)
          return (
            <Column key={col.id} col={col} projects={colProjects} />
          )
        })}
      </div>

      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
