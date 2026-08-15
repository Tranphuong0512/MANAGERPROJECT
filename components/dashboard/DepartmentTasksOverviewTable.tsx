'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  FolderGit2,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  CheckCheck,
  RotateCcw,
  User,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  ChevronLeft
} from 'lucide-react'
import { showToast } from '@/utils/alert'
import { formatVietnamDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

export interface TaskOverviewItem {
  id: string | number
  raw_id?: string | number
  title: string
  project_id?: string | number
  project_name: string
  department_id?: string | number
  department_name: string
  assignee?: {
    id?: string | number
    full_name?: string
    avatar_url?: string
  }
  start_date?: string | null
  due_date?: string | null
  progress: number
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  source: 'supabase' | 'apec'
  employee_assignments?: any[]
  created_at?: string
}

interface DepartmentTasksOverviewTableProps {
  initialTasks?: TaskOverviewItem[]
  projects?: any[]
  departments?: any[]
  onRefresh?: () => void
  isLoading?: boolean
}

export function DepartmentTasksOverviewTable({
  initialTasks = [],
  projects = [],
  departments = [],
  onRefresh,
  isLoading = false,
}: DepartmentTasksOverviewTableProps) {
  const [tasks, setTasks] = useState<TaskOverviewItem[]>(initialTasks)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'review' | 'in_progress' | 'overdue' | 'done'>('all')
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string | number>>(new Set())
  const [processingIds, setProcessingIds] = useState<Set<string | number>>(new Set())
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Đồng bộ props initialTasks khi thay đổi từ parent
  React.useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Trích xuất danh sách phòng ban duy nhất từ tasks + departments prop
  const departmentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    
    // Khởi tạo từ danh sách departments
    departments.forEach(d => {
      if (d && d.name) {
        const key = d.name.trim().toLowerCase()
        map.set(key, { id: String(d.id || key), name: d.name.trim(), count: 0 })
      }
    })

    // Đếm số task theo từng phòng ban
    tasks.forEach(t => {
      const deptName = t.department_name ? t.department_name.trim() : 'Chung / Chưa phân loại'
      const key = deptName.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, { id: String(t.department_id || key), name: deptName, count: 1 })
      }
    })

    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [departments, tasks])

  // Trích xuất danh sách dự án
  const projectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    projects.forEach(p => {
      if (p && p.name) {
        map.set(String(p.id), { id: String(p.id), name: p.name, count: 0 })
      }
    })
    tasks.forEach(t => {
      const pId = String(t.project_id || '')
      const pName = t.project_name || 'Dự án'
      if (pId) {
        const existing = map.get(pId)
        if (existing) existing.count++
        else map.set(pId, { id: pId, name: pName, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [projects, tasks])

  // Thống kê nhanh theo trạng thái
  const stats = useMemo(() => {
    const now = new Date()
    let reviewCount = 0
    let inProgressCount = 0
    let doneCount = 0
    let todoCount = 0
    let overdueCount = 0

    tasks.forEach(t => {
      if (t.status === 'review' || (t.progress >= 100 && t.status !== 'done')) {
        reviewCount++
      } else if (t.status === 'done') {
        doneCount++
      } else if (t.status === 'in_progress') {
        inProgressCount++
      } else {
        todoCount++
      }

      if (t.due_date && t.status !== 'done') {
        if (new Date(t.due_date) < now) {
          overdueCount++
        }
      }
    })

    return {
      total: tasks.length,
      review: reviewCount,
      inProgress: inProgressCount,
      done: doneCount,
      todo: todoCount,
      overdue: overdueCount,
    }
  }, [tasks])

  // Lọc danh sách công việc
  const filteredTasks = useMemo(() => {
    const now = new Date()
    return tasks.filter(t => {
      // 1. Lọc theo Tab nhanh
      if (activeTab === 'review') {
        const isReview = t.status === 'review' || (t.progress >= 100 && t.status !== 'done')
        if (!isReview) return false
      } else if (activeTab === 'in_progress') {
        if (t.status !== 'in_progress') return false
      } else if (activeTab === 'done') {
        if (t.status !== 'done') return false
      } else if (activeTab === 'overdue') {
        const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < now
        if (!isOverdue) return false
      }

      // 2. Lọc theo Phòng Ban
      if (selectedDepartment !== 'all') {
        const tDept = (t.department_name || '').toLowerCase().trim()
        const selectedDeptObj = departmentOptions.find(d => String(d.id) === String(selectedDepartment) || d.name.toLowerCase() === selectedDepartment.toLowerCase())
        const targetName = selectedDeptObj ? selectedDeptObj.name.toLowerCase() : selectedDepartment.toLowerCase()
        if (tDept !== targetName && String(t.department_id) !== String(selectedDepartment)) {
          return false
        }
      }

      // 3. Lọc theo Dự án
      if (selectedProject !== 'all') {
        if (String(t.project_id) !== String(selectedProject)) return false
      }

      // 4. Lọc theo Trạng thái Dropdown
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'review') {
          if (t.status !== 'review' && !(t.progress >= 100 && t.status !== 'done')) return false
        } else if (selectedStatus === 'overdue') {
          const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < now
          if (!isOverdue) return false
        } else {
          if (t.status !== selectedStatus) return false
        }
      }

      // 5. Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = t.title?.toLowerCase().includes(q)
        const matchProject = t.project_name?.toLowerCase().includes(q)
        const matchDept = t.department_name?.toLowerCase().includes(q)
        const matchAssignee = t.assignee?.full_name?.toLowerCase().includes(q)
        if (!matchTitle && !matchProject && !matchDept && !matchAssignee) {
          return false
        }
      }

      return true
    })
  }, [tasks, activeTab, selectedDepartment, selectedProject, selectedStatus, searchQuery, departmentOptions])

  // Phân trang
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, currentPage, pageSize])

  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1

  // Handler: Duyệt 1 công việc trực tiếp (1-Click Approve)
  const handleApproveTask = async (task: TaskOverviewItem) => {
    const taskId = task.id
    setProcessingIds(prev => new Set(prev).add(taskId))

    // Optimistic UI update: Cập nhật ngay lập tức trên bảng
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'done', progress: 100 }
          : t
      )
    )

    try {
      if (task.source === 'apec' || String(taskId).startsWith('apec_') || !isNaN(Number(task.id))) {
        // Duyệt trên APEC GLOBAL
        const rawId = task.raw_id || String(task.id).replace(/^apec_/, '')
        const numId = Number(rawId)

        // Duyệt từng assignment con nếu có
        const assignments = Array.isArray(task.employee_assignments) ? task.employee_assignments : []
        if (assignments.length > 0) {
          for (const ea of assignments) {
            const eaId = ea.id || ea.ea_id || ea.raw_id
            if (eaId) {
              const cleanEaId = Number(String(eaId).replace(/^[^\d]+/, ''))
              if (!isNaN(cleanEaId) && cleanEaId > 0) {
                await fetch('/api/v1/apec-global/approve', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ task_assignment_id: cleanEaId })
                }).catch(() => {})
              }
            }
          }
        }

        // Cập nhật trạng thái task APEC thành done
        await fetch('/api/v1/apec-global/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: numId || task.id,
            process: 100,
            progress: 100,
            status: 'done',
            is_completed: true
          })
        }).catch(err => console.warn('APEC task update fallback:', err))
      } else {
        // Duyệt trên Supabase
        try {
          await supabase
            .from('checklist_items')
            .update({
              status: 'done',
              is_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
        } catch {}

        try {
          await supabase
            .from('tasks')
            .update({
              status: 'done',
              progress_percentage: 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
        } catch {}
      }

      showToast('success', `Đã duyệt hoàn thành công việc: "${task.title}"`, 'Duyệt thành công')
    } catch (err: any) {
      console.error('Lỗi duyệt task:', err)
      showToast('error', `Không thể duyệt công việc: ${err.message || 'Lỗi kết nối'}`)
      // Rollback nếu thất bại
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: task.status, progress: task.progress }
            : t
        )
      )
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Handler: Yêu cầu sửa lại (Reject / Return to In Progress)
  const handleRejectTask = async (task: TaskOverviewItem) => {
    const taskId = task.id
    setProcessingIds(prev => new Set(prev).add(taskId))

    // Optimistic UI
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'in_progress', progress: 90 }
          : t
      )
    )

    try {
      if (task.source === 'apec' || !isNaN(Number(task.id))) {
        const rawId = task.raw_id || String(task.id).replace(/^apec_/, '')
        await fetch('/api/v1/apec-global/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: Number(rawId) || task.id,
            process: 90,
            progress: 90,
            status: 'in_progress',
            is_completed: false
          })
        })
      } else {
        await supabase
          .from('checklist_items')
          .update({
            status: 'in_progress',
            is_completed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id)
      }

      showToast('info', `Đã chuyển công việc "${task.title}" về trạng thái Đang làm để nhân viên chỉnh sửa.`, 'Yêu cầu sửa lại')
    } catch (err: any) {
      console.error('Lỗi trả lại task:', err)
      showToast('error', `Lỗi khi cập nhật trạng thái: ${err.message}`)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Handler: Duyệt hàng loạt (Bulk Approve)
  const handleBulkApprove = async () => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id) && (t.status === 'review' || t.progress >= 100))
    if (selectedTasks.length === 0) return

    setIsBulkApproving(true)
    let successCount = 0

    for (const task of selectedTasks) {
      try {
        await handleApproveTask(task)
        successCount++
      } catch (e) {
        console.error('Lỗi bulk approve:', e)
      }
    }

    setSelectedTaskIds(new Set())
    setIsBulkApproving(false)
    showToast('success', `Đã duyệt thành công ${successCount} công việc được chọn!`, 'Hoàn tất duyệt hàng loạt')
  }

  // Chọn / bỏ chọn tất cả các task chờ duyệt trên trang hiện tại
  const reviewTasksOnPage = paginatedTasks.filter(t => t.status === 'review' || (t.progress >= 100 && t.status !== 'done'))
  const allPageReviewsSelected = reviewTasksOnPage.length > 0 && reviewTasksOnPage.every(t => selectedTaskIds.has(t.id))

  const toggleSelectAllPageReviews = () => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (allPageReviewsSelected) {
        reviewTasksOnPage.forEach(t => next.delete(t.id))
      } else {
        reviewTasksOnPage.forEach(t => next.add(t.id))
      }
      return next
    })
  }

  const toggleSelectTask = (id: string | number) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Helper render badge trạng thái
  const renderStatusBadge = (status: string, progress: number, dueDate?: string | null) => {
    const now = new Date()
    const isOverdue = dueDate && status !== 'done' && new Date(dueDate) < now

    if (status === 'done') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Đã hoàn thành / Đã duyệt
        </span>
      )
    }

    if (status === 'review' || progress >= 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          ⏳ Chờ duyệt (100%)
        </span>
      )
    }

    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          Đang thực hiện ({progress}%)
        </span>
      )
    }

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Quá hạn ({progress}%)
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        Chưa thực hiện
      </span>
    )
  }

  // Helper render màu badge phòng ban
  const getDepartmentColor = (name: string) => {
    const lower = (name || '').toLowerCase()
    if (lower.includes('giám đốc') || lower.includes('quản trị') || lower.includes('bod')) return 'bg-rose-50 text-rose-700 border-rose-200'
    if (lower.includes('kỹ thuật') || lower.includes('tech') || lower.includes('dev') || lower.includes('it')) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (lower.includes('kinh doanh') || lower.includes('sale') || lower.includes('sales')) return 'bg-purple-50 text-purple-700 border-purple-200'
    if (lower.includes('marketing') || lower.includes('mkt')) return 'bg-amber-50 text-amber-700 border-amber-200'
    if (lower.includes('nhân sự') || lower.includes('hr')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (lower.includes('kế toán') || lower.includes('tài chính')) return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-8 transition-all">
      {/* ─── HEADER: TITLE & STATS COUNTER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Bảng Giám Sát & Duyệt Công Việc Theo Phòng Ban
              </h2>
              {stats.review > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-sm shadow-amber-500/30 animate-bounce">
                  <Clock className="w-3 h-3" />
                  {stats.review} việc chờ duyệt
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi và phê duyệt trực tiếp toàn bộ công việc của các Phòng ban trong tất cả dự án
            </p>
          </div>
        </div>

        {/* Action buttons & refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedTaskIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {isBulkApproving ? 'Đang duyệt...' : `Duyệt (${selectedTaskIds.size}) mục đã chọn`}
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              Làm mới
            </button>
          )}
        </div>
      </div>

      {/* ─── FILTER TABS & SEARCH BAR ─── */}
      <div className="flex flex-col gap-3.5 pt-4 pb-2">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1) }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({stats.total})
          </button>

          <button
            onClick={() => { setActiveTab('review'); setCurrentPage(1) }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            ⏳ Chờ duyệt ({stats.review})
          </button>

          <button
            onClick={() => { setActiveTab('in_progress'); setCurrentPage(1) }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'in_progress'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Đang làm ({stats.inProgress})
          </button>

          <button
            onClick={() => { setActiveTab('overdue'); setCurrentPage(1) }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Quá hạn ({stats.overdue})
          </button>

          <button
            onClick={() => { setActiveTab('done'); setCurrentPage(1) }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'done'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Hoàn thành ({stats.done})
          </button>
        </div>

        {/* Detailed Dropdown Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Lọc theo Phòng Ban */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Phòng Ban ({departmentOptions.length})
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedDepartment}
                onChange={e => { setSelectedDepartment(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Tất cả Phòng Ban ({tasks.length})</option>
                {departmentOptions.map(dept => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name} ({dept.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Lọc theo Dự Án */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Dự Án ({projectOptions.length})
            </label>
            <div className="relative">
              <FolderGit2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedProject}
                onChange={e => { setSelectedProject(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Tất cả Dự Án ({tasks.length})</option>
                {projectOptions.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Lọc theo Trạng thái */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Trạng thái chi tiết
            </label>
            <div className="relative">
              <SlidersHorizontal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="review">⏳ Chờ duyệt (100%)</option>
                <option value="in_progress">⚡ Đang thực hiện</option>
                <option value="todo">📋 Chưa thực hiện</option>
                <option value="done">✅ Hoàn thành / Đã duyệt</option>
                <option value="overdue">⚠️ Quá hạn</option>
              </select>
            </div>
          </div>

          {/* 4. Tìm kiếm từ khóa */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tìm kiếm công việc / nhân sự
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tên việc, nhân sự, dự án..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABLE VIEW ─── */}
      <div className="overflow-x-auto mt-4 rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allPageReviewsSelected}
                  onChange={toggleSelectAllPageReviews}
                  disabled={reviewTasksOnPage.length === 0}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                  title="Chọn tất cả mục chờ duyệt trên trang"
                />
              </th>
              <th className="py-3 px-4 min-w-[240px]">Tên Công Việc</th>
              <th className="py-3 px-4 min-w-[170px]">Dự Án</th>
              <th className="py-3 px-4 min-w-[150px]">Phòng Ban</th>
              <th className="py-3 px-4 min-w-[150px]">Người Thực Hiện</th>
              <th className="py-3 px-4 min-w-[130px]">Thời Gian / Hạn Chót</th>
              <th className="py-3 px-4 min-w-[170px]">Tiến Độ & Trạng Thái</th>
              <th className="py-3 px-4 min-w-[160px] text-right">Thao Tác Duyệt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy công việc nào phù hợp</p>
                    <p className="text-xs text-slate-400">Thử thay đổi bộ lọc Phòng ban, Trạng thái hoặc từ khóa tìm kiếm</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task, idx) => {
                const isReview = task.status === 'review' || (task.progress >= 100 && task.status !== 'done')
                const isProcessing = processingIds.has(task.id)
                const isChecked = selectedTaskIds.has(task.id)

                return (
                  <tr
                    key={`${task.source}_${task.id}_${idx}`}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isReview ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectTask(task.id)}
                        disabled={!isReview}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-20"
                      />
                    </td>

                    {/* Tên công việc */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 line-clamp-2 leading-snug">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.source === 'apec' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {task.source === 'apec' ? 'APEC Global' : 'Nội bộ'}
                        </span>
                        {task.priority === 'critical' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Khẩn cấp</span>
                        )}
                        {task.priority === 'high' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Ưu tiên cao</span>
                        )}
                      </div>
                    </td>

                    {/* Dự án */}
                    <td className="py-3.5 px-4">
                      {task.project_id ? (
                        <Link
                          href={`/dashboard/projects/${task.project_id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline group"
                        >
                          <FolderGit2 className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                          <span className="line-clamp-1">{task.project_name || 'Dự án'}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ) : (
                        <span className="text-slate-500 font-medium">{task.project_name || 'Chung'}</span>
                      )}
                    </td>

                    {/* Phòng Ban */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getDepartmentColor(task.department_name)}`}>
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="line-clamp-1">{task.department_name || 'Chung'}</span>
                      </span>
                    </td>

                    {/* Người thực hiện */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {task.assignee?.avatar_url ? (
                          <img
                            src={task.assignee.avatar_url}
                            alt={task.assignee.full_name || 'User'}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">
                            {task.assignee?.full_name ? task.assignee.full_name.charAt(0) : <User className="w-3 h-3 text-slate-500" />}
                          </div>
                        )}
                        <span className="font-medium text-slate-800 line-clamp-1">
                          {task.assignee?.full_name || 'Chưa phân công'}
                        </span>
                      </div>
                    </td>

                    {/* Thời gian / Hạn chót */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-[11px] text-slate-600">
                        {task.due_date ? (
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatVietnamDate(task.due_date)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa đặt hạn</span>
                        )}
                        {task.start_date && (
                          <span className="text-[10px] text-slate-400">
                            Bắt đầu: {formatVietnamDate(task.start_date)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tiến độ & Trạng thái */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              task.status === 'done'
                                ? 'bg-emerald-500'
                                : isReview
                                ? 'bg-amber-500 animate-pulse'
                                : task.progress > 50
                                ? 'bg-blue-600'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                          />
                        </div>
                        {renderStatusBadge(task.status, task.progress, task.due_date)}
                      </div>
                    </td>

                    {/* Thao tác Duyệt trực tiếp */}
                    <td className="py-3.5 px-4 text-right">
                      {isReview ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleApproveTask(task)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                            title="Duyệt hoàn thành 100%"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isProcessing ? 'Đang duyệt...' : 'Duyệt'}
                          </button>

                          <button
                            onClick={() => handleRejectTask(task)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all disabled:opacity-50"
                            title="Yêu cầu nhân viên chỉnh sửa lại"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Sửa
                          </button>
                        </div>
                      ) : task.status === 'done' ? (
                        <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                          <CheckCheck className="w-4 h-4 text-emerald-500" />
                          Đã phê duyệt
                        </span>
                      ) : (
                        <Link
                          href={task.project_id ? `/dashboard/projects/${task.project_id}` : '/dashboard/projects'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Chi tiết
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── FOOTER & PAGINATION ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value={10}>10 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
          <span>
            trong tổng số <strong className="text-slate-800">{filteredTasks.length}</strong> công việc
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-semibold text-slate-700">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
