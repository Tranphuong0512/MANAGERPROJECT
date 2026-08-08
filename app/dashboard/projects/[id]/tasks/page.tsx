'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { customAlert, customConfirm } from '@/utils/alert'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  assigned_to?: string
  assigned_user?: { full_name: string }
  due_date?: string
  created_at: string
}

export default function ProjectTasksPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .is('deleted_at', null)
          .single()

        if (!projectData) {
          router.push('/dashboard/projects')
          return
        }

        setProject(projectData)

        // Load tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select(`
            *,
            assigned_user:profiles!tasks_assigned_to_fkey (full_name, avatar_url)
          `)
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        setTasks(tasksData || [])

        // Group tasks by status for Kanban view
        const grouped = (tasksData || []).reduce(
          (acc, task) => {
            if (!acc[task.status]) {
              acc[task.status] = []
            }
            acc[task.status].push(task)
            return acc
          },
          {} as Record<string, Task[]>
        )

        setGroupedTasks(grouped)
      } catch (err) {
        console.error('Error loading project:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId, router])

  const handleDeleteTask = async (taskId: string) => {
    if (!(await customConfirm('Are you sure you want to delete this task?'))) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const handleTaskCreated = () => {
    // Reload tasks
    window.location.reload()
  }

  if (isLoading) {
    return <div className="text-center py-12">Đang tải danh sách công việc...</div>
  }

  if (!project) {
    return <div className="text-center py-12 text-red-600">Không tìm thấy dự án</div>
  }

  const statuses = ['todo', 'in_progress', 'in_review', 'done']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${projectId}`} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Công việc - {project.name}</h1>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-5 h-5" />
          Công việc mới
        </button>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('kanban')}
          className={`px-4 py-2 rounded-lg font-medium ${
            viewMode === 'kanban'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
          }`}
        >
          Kanban Board
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg font-medium ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
          }`}
        >
          List View
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map(status => (
            <div key={status} className="bg-slate-100 rounded-lg p-4 min-h-[500px]">
              <h3 className="font-semibold text-slate-900 mb-4 capitalize">
                {TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status}
              </h3>
              <div className="space-y-3">
                {(groupedTasks[status] || []).map(task => (
                  <Link key={task.id} href={`/dashboard/projects/${projectId}/tasks/${task.id}`}>
                    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-move">
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <h4 className="font-medium text-slate-900 flex-1 line-clamp-2">{task.title}</h4>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteTask(task.id)
                          }}
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || '#6B7280' }}
                        >
                          {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.assigned_user?.full_name && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-300 inline-block"></span>
                            {task.assigned_user.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <Link key={task.id} href={`/dashboard/projects/${projectId}/tasks/${task.id}`}>
                <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex gap-3 mt-3 flex-wrap">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS] || '#6B7280' }}
                        >
                          {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] || task.status}
                        </span>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || '#6B7280' }}
                        >
                          {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.assigned_user?.full_name && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-blue-200 inline-block"></span>
                            {task.assigned_user.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteTask(task.id)
                      }}
                      className="p-1 hover:bg-red-50 rounded ml-4"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="bg-slate-50 rounded-lg p-12 text-center">
              <p className="text-slate-600 mb-4">Chưa có công việc nào</p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Create first task
              </button>
            </div>
          )}
        </div>
      )}

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}
