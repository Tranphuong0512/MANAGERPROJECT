'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import { customAlert, customConfirm } from '@/utils/alert'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  assigned_to?: string
  due_date?: string
  progress_percentage: number
  estimated_hours?: number
  actual_hours?: number
  version: number
  change_count: number
  created_at: string
  updated_at: string
  parent_task_id?: string
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const taskId = params.taskId as string

  const [task, setTask] = useState<Task | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [team, setTeam] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    progress_percentage: 0,
    estimated_hours: '',
    actual_hours: '',
  })

  useEffect(() => {
    const loadTaskData = async () => {
      try {
        // Load task
        const { data: taskData } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .is('deleted_at', null)
          .single()

        if (!taskData) {
          router.push(`/dashboard/projects/${projectId}/tasks`)
          return
        }

        setTask(taskData)
        setFormData({
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status,
          priority: taskData.priority,
          assigned_to: taskData.assigned_to || '',
          due_date: taskData.due_date || '',
          progress_percentage: taskData.progress_percentage,
          estimated_hours: taskData.estimated_hours || '',
          actual_hours: taskData.actual_hours || '',
        })

        // Load history
        const { data: historyData } = await supabase
          .from('task_history')
          .select(`
            *,
            user:profiles (full_name, avatar_url)
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })

        setHistory(historyData || [])

        // Load project members
        const { data: projectData } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', projectId)
          .single()

        if (projectData) {
          const { data: membersData } = await supabase
            .from('organization_members')
            .select(`
              user_id,
              profiles (id, full_name, avatar_url)
            `)
            .eq('organization_id', projectData.organization_id)
            .is('deleted_at', null)

          if (membersData) {
            const uniqueProfiles = Array.from(
              new Map(membersData.map(om => om.profiles).filter(Boolean).map((p: any) => [p.id, p])).values()
            )
            setTeam(uniqueProfiles)
          }
        }
      } catch (err) {
        console.error('Error loading task:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTaskData()
  }, [taskId, projectId, router])

  const handleSave = async () => {
    if (!task) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          ...formData,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error

      await customAlert('Task updated successfully')
    } catch (err) {
      console.error('Error saving task:', err)
      await customAlert('Failed to save task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!(await customConfirm('Are you sure you want to delete this task?'))) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      router.push(`/dashboard/projects/${projectId}/tasks`)
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Đang tải công việc...</div>
  }

  if (!task) {
    return <div className="text-center py-12 text-red-600">Không tìm thấy công việc</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${projectId}/tasks`} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Chi tiết công việc</h1>
            <p className="text-slate-600 mt-1">v{task.version} • {task.change_count} changes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-slate-400"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Đang lưu...' : 'Save'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Description */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Tiêu đề</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </div>

          {/* Chi tiết công việc */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Chi tiết công việc</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">Đang thực hiện</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Độ ưu tiên</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Assign To</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {team.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Hạn chót</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Tiến độ: {formData.progress_percentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formData.progress_percentage}
                onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Giờ dự kiến</label>
                <input
                  type="number"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Giờ thực tế</label>
                <input
                  type="number"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-600">Trạng thái</p>
              <span
                className="inline-block mt-1 px-3 py-1 rounded text-sm font-medium text-white"
                style={{ backgroundColor: TASK_STATUS_COLORS[formData.status as keyof typeof TASK_STATUS_COLORS] || '#6B7280' }}
              >
                {TASK_STATUS_LABELS[formData.status as keyof typeof TASK_STATUS_LABELS] || formData.status}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-600">Độ ưu tiên</p>
              <span
                className="inline-block mt-1 px-3 py-1 rounded text-sm font-medium text-white"
                style={{ backgroundColor: PRIORITY_COLORS[formData.priority as keyof typeof PRIORITY_COLORS] || '#6B7280' }}
              >
                {formData.priority?.charAt(0).toUpperCase() + formData.priority?.slice(1)}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-600">Ngày tạo</p>
              <p className="text-sm text-slate-900 mt-1">{new Date(task.created_at).toLocaleDateString()}</p>
            </div>

            <div>
              <p className="text-xs text-slate-600">Cập nhật</p>
              <p className="text-sm text-slate-900 mt-1">{new Date(task.updated_at).toLocaleString()}</p>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Lịch sử thay đổi</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.length > 0 ? (
                history.map(entry => (
                  <div key={entry.id} className="text-xs">
                    <p className="font-medium text-slate-900 capitalize">{entry.action}</p>
                    <p className="text-slate-600">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">Chưa có thay đổi nào</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
