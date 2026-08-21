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
  ChevronDown,
  CheckCheck,
  RotateCcw,
  User,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  ChevronLeft,
  CheckSquare,
  ListTodo,
  FileSpreadsheet,
  CornerDownRight,
  Users,
  Tag
} from 'lucide-react'
import { showToast } from '@/utils/alert'
import { formatVietnamDate, parseToVietnamDate, getVietnamDateString } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'

export interface SubtaskOverviewItem {
  id: string | number
  raw_id?: string | number
  title: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | string
  progress?: number
  process?: number
  checked?: boolean
  assignee?: {
    id?: string | number
    full_name?: string
    avatar_url?: string
  }
  start_date?: string | null
  due_date?: string | null
  ea_id?: string | number
  task_id?: string | number
}

export interface TaskOverviewItem {
  id: string | number
  raw_id?: string | number
  title: string
  project_id?: string | number
  project_name: string
  department_id?: string | number
  department_name: string
  checklist_title?: string
  assignee?: {
    id?: string | number
    full_name?: string
    avatar_url?: string
  }
  assignees?: Array<{
    id?: string | number
    full_name?: string
    avatar_url?: string
    department_name?: string
    department_id?: string | number
  }>
  start_date?: string | null
  due_date?: string | null
  progress: number
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  source: 'supabase' | 'apec'
  employee_assignments?: any[]
  subtasks?: SubtaskOverviewItem[]
  task_type?: 'shared' | 'personal' | string
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
  const { hasPermission, isOwner, isManager, isTeamLead } = usePermissions()
  const canApprove = isOwner || isManager || isTeamLead || hasPermission('approve_overview')

  const [tasks, setTasks] = useState<TaskOverviewItem[]>(initialTasks)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedChecklistType, setSelectedChecklistType] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'review' | 'in_progress' | 'overdue' | 'done'>('all')
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string | number>>(new Set())
  const [processingIds, setProcessingIds] = useState<Set<string | number>>(new Set())
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string | number>>(new Set())
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Đồng bộ props initialTasks khi thay đổi từ parent
  React.useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Helper: Bật / tắt hiển thị công việc con của một task cha
  const toggleExpandTask = (taskId: string | number) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  // Helper: Kiểm tra khớp phòng ban (quét cả phòng ban task và phòng ban từng nhân sự)
  const isMatchDept = (t: TaskOverviewItem, deptVal: string) => {
    if (deptVal === 'all') return true;
    const targetDeptKey = deptVal.trim().toLowerCase();
    const tDeptName = (t.department_name || 'Chung / Chưa phân loại').trim().toLowerCase();
    const selectedDeptObj = departments.find(d => String(d.id) === String(deptVal) || d.name.trim().toLowerCase() === targetDeptKey);
    const targetName = selectedDeptObj ? selectedDeptObj.name.trim().toLowerCase() : targetDeptKey;
    const matchesName = tDeptName === targetName || tDeptName === targetDeptKey;
    const matchesId = t.department_id && String(t.department_id) === String(deptVal);
    
    // Quét thêm danh sách assignees
    const matchesAssigneeDept = t.assignees?.some(a => {
      const aDept = (a.department_name || '').trim().toLowerCase()
      return aDept === targetName || aDept === targetDeptKey || (a.department_id && String(a.department_id) === String(deptVal))
    })

    return Boolean(matchesName || matchesId || matchesAssigneeDept);
  };

  // Helper: Kiểm tra khớp dự án
  const isMatchProj = (t: TaskOverviewItem, projVal: string) => {
    if (projVal === 'all') return true;
    const targetProjKey = projVal.trim().toLowerCase();
    const tProjId = String(t.project_id || '').toLowerCase();
    const tProjName = (t.project_name || '').trim().toLowerCase();
    const selectedProjObj = projects.find(p => String(p.id) === String(projVal) || p.name.trim().toLowerCase() === targetProjKey);
    const targetName = selectedProjObj ? selectedProjObj.name.trim().toLowerCase() : targetProjKey;
    const matchesId = tProjId === targetProjKey || (selectedProjObj && tProjId === String(selectedProjObj.id).toLowerCase());
    const matchesName = tProjName === targetName || tProjName === targetProjKey;
    return Boolean(matchesId || matchesName);
  };

  // Helper: Kiểm tra khớp loại checklist
  const isMatchChecklistType = (t: TaskOverviewItem, typeVal: string) => {
    if (typeVal === 'all') return true;
    const targetKey = typeVal.trim().toLowerCase();
    const tType = (t.checklist_title || 'Nhiệm vụ chung').trim().toLowerCase();
    return tType === targetKey;
  };

  // Helper: Kiểm tra khớp từ khóa tìm kiếm (quét tiêu đề, dự án, phòng ban, tất cả nhân sự và cả công việc con)
  const isMatchSearchQuery = (t: TaskOverviewItem, query: string) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const matchTitle = t.title?.toLowerCase().includes(q);
    const matchProject = t.project_name?.toLowerCase().includes(q);
    const matchDept = t.department_name?.toLowerCase().includes(q);
    const matchAssignee = t.assignee?.full_name?.toLowerCase().includes(q);
    const matchChecklist = t.checklist_title?.toLowerCase().includes(q);
    const matchOtherAssignees = t.assignees?.some(a => a.full_name?.toLowerCase().includes(q) || a.department_name?.toLowerCase().includes(q));
    const matchSubtasks = t.subtasks?.some(s => s.title?.toLowerCase().includes(q) || s.assignee?.full_name?.toLowerCase().includes(q));
    return Boolean(matchTitle || matchProject || matchDept || matchAssignee || matchChecklist || matchOtherAssignees || matchSubtasks);
  };

  // Helper: Kiểm tra khớp trạng thái dropdown
  const isMatchDropdownStatus = (t: TaskOverviewItem, statusVal: string) => {
    if (statusVal === 'all') return true;
    const now = new Date();
    if (statusVal === 'review') return t.status === 'review';
    if (statusVal === 'overdue') return Boolean(t.due_date && t.status !== 'done' && t.status !== 'review' && new Date(t.due_date) < now);
    if (statusVal === 'done') return t.status === 'done';
    return t.status === statusVal;
  };

  // Trích xuất danh sách loại checklist động (phản ánh theo phòng ban, dự án & tìm kiếm)
  const checklistTypeOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()

    tasks.forEach(t => {
      if (
        !isMatchDept(t, selectedDepartment) ||
        !isMatchProj(t, selectedProject) ||
        !isMatchSearchQuery(t, searchQuery) ||
        !isMatchDropdownStatus(t, selectedStatus)
      ) {
        return;
      }
      const rawName = t.checklist_title ? t.checklist_title.trim() : 'Nhiệm vụ chung';
      const key = rawName.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { id: key, name: rawName, count: 1 });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tasks, selectedDepartment, selectedProject, searchQuery, selectedStatus, departments, projects]);

  // Trích xuất danh sách phòng ban động (phản ánh theo dự án, loại checklist & tìm kiếm đang chọn)
  const departmentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    departments.forEach(d => {
      if (d && d.name) {
        const key = d.name.trim().toLowerCase()
        map.set(key, { id: String(d.id || key), name: d.name.trim(), count: 0 })
      }
    })

    // Đếm số task theo từng phòng ban trong phạm vi bộ lọc Dự án, Loại Checklist & Tìm kiếm
    tasks.forEach(t => {
      if (
        !isMatchProj(t, selectedProject) ||
        !isMatchChecklistType(t, selectedChecklistType) ||
        !isMatchSearchQuery(t, searchQuery) ||
        !isMatchDropdownStatus(t, selectedStatus)
      ) {
        return
      }
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
  }, [departments, tasks, selectedProject, selectedChecklistType, searchQuery, selectedStatus, projects])

  // Trích xuất danh sách dự án động (phản ánh theo phòng ban, loại checklist & tìm kiếm đang chọn)
  const projectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    projects.forEach(p => {
      if (p && p.name) {
        map.set(String(p.id), { id: String(p.id), name: p.name, count: 0 })
      }
    })

    tasks.forEach(t => {
      if (
        !isMatchDept(t, selectedDepartment) ||
        !isMatchChecklistType(t, selectedChecklistType) ||
        !isMatchSearchQuery(t, searchQuery) ||
        !isMatchDropdownStatus(t, selectedStatus)
      ) {
        return
      }
      const pId = String(t.project_id || '')
      const pName = t.project_name || 'Dự án'
      if (pId) {
        const existing = map.get(pId)
        if (existing) existing.count++
        else map.set(pId, { id: pId, name: pName, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [projects, tasks, selectedDepartment, selectedChecklistType, searchQuery, selectedStatus, departments])

  // Thống kê nhanh theo trạng thái TRONG PHẠM VI BỘ LỌC ĐANG CHỌN (Phòng ban, Dự án, Loại Checklist, Tìm kiếm)
  const stats = useMemo(() => {
    const now = new Date()
    let reviewCount = 0
    let inProgressCount = 0
    let doneCount = 0
    let todoCount = 0
    let overdueCount = 0
    let totalCount = 0

    tasks.forEach(t => {
      // Áp dụng bộ lọc ngữ cảnh: Phòng ban, Dự án, Loại Checklist, Tìm kiếm, Dropdown trạng thái
      if (!isMatchDept(t, selectedDepartment)) return
      if (!isMatchProj(t, selectedProject)) return
      if (!isMatchChecklistType(t, selectedChecklistType)) return
      if (!isMatchSearchQuery(t, searchQuery)) return
      if (!isMatchDropdownStatus(t, selectedStatus)) return

      totalCount++
      if (t.status === 'review') {
        reviewCount++
      } else if (t.status === 'done') {
        doneCount++
      } else if (t.status === 'in_progress') {
        inProgressCount++
      } else {
        todoCount++
      }

      if (t.due_date && t.status !== 'done' && t.status !== 'review') {
        if (new Date(t.due_date) < now) {
          overdueCount++
        }
      }
    })

    return {
      total: totalCount,
      review: reviewCount,
      inProgress: inProgressCount,
      done: doneCount,
      todo: todoCount,
      overdue: overdueCount,
    }
  }, [tasks, selectedDepartment, selectedProject, selectedChecklistType, searchQuery, selectedStatus, departments, projects])

  // Lọc danh sách công việc theo tất cả điều kiện lọc
  const filteredTasks = useMemo(() => {
    const now = new Date()
    return tasks.filter(t => {
      // 1. Khớp phòng ban
      if (!isMatchDept(t, selectedDepartment)) return false

      // 2. Khớp dự án
      if (!isMatchProj(t, selectedProject)) return false

      // 3. Khớp loại checklist
      if (!isMatchChecklistType(t, selectedChecklistType)) return false

      // 4. Khớp từ khóa tìm kiếm
      if (!isMatchSearchQuery(t, searchQuery)) return false

      // 5. Lọc theo Tab nhanh
      if (activeTab === 'review') {
        if (t.status !== 'review') return false
      } else if (activeTab === 'in_progress') {
        if (t.status !== 'in_progress') return false
      } else if (activeTab === 'done') {
        if (t.status !== 'done') return false
      } else if (activeTab === 'overdue') {
        const isOverdue = t.due_date && t.status !== 'done' && t.status !== 'review' && new Date(t.due_date) < now
        if (!isOverdue) return false
      }

      // 6. Lọc theo Trạng thái Dropdown
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'review') {
          if (t.status !== 'review') return false
        } else if (selectedStatus === 'overdue') {
          const isOverdue = t.due_date && t.status !== 'done' && t.status !== 'review' && new Date(t.due_date) < now
          if (!isOverdue) return false
        } else if (selectedStatus === 'done') {
          if (t.status !== 'done') return false
        } else {
          if (t.status !== selectedStatus) return false
        }
      }

      return true
    })
  }, [tasks, activeTab, selectedDepartment, selectedProject, selectedChecklistType, selectedStatus, searchQuery, departments, projects])

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
          ? {
              ...t,
              status: 'done',
              progress: 100,
              subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({ ...s, checked: true, status: 'done', progress: 100, process: 100 })) : []
            }
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
        // Duyệt trên Supabase: cập nhật cả checklist_items và tasks
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
            ? { ...t, status: task.status, progress: task.progress, subtasks: task.subtasks }
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
        try {
          await supabase
            .from('checklist_items')
            .update({
              status: 'in_progress',
              is_completed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
        } catch {}

        try {
          await supabase
            .from('tasks')
            .update({
              status: 'in_progress',
              progress_percentage: 90,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
        } catch {}
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

  // Handler: Duyệt / Đổi trạng thái 1 công việc con (Subtask Toggle/Approve)
  const handleToggleSubtask = async (task: TaskOverviewItem, subtask: SubtaskOverviewItem, subIdx: number) => {
    const subId = subtask.id
    const subKey = `sub_${subId}`
    setProcessingIds(prev => new Set(prev).add(subKey))

    const currentChecked = Boolean(subtask.checked || subtask.status === 'done' || (subtask.progress && subtask.progress >= 100))
    const targetChecked = !currentChecked
    const targetStatus = targetChecked ? 'done' : 'in_progress'
    const targetProgress = targetChecked ? 100 : 0

    // Optimistic UI update trên subtasks
    setTasks(prev =>
      prev.map(t => {
        if (t.id === task.id && Array.isArray(t.subtasks)) {
          const updatedSubs = t.subtasks.map((s, idx) => {
            if (s.id === subId || idx === subIdx) {
              return {
                ...s,
                checked: targetChecked,
                status: targetStatus,
                progress: targetProgress,
                process: targetProgress
              }
            }
            return s
          })
          const allDone = updatedSubs.every(s => s.checked || s.status === 'done' || (s.progress && s.progress >= 100))
          const avgProg = updatedSubs.length > 0
            ? Math.round(updatedSubs.reduce((acc, cur) => acc + (cur.progress ?? (cur.checked ? 100 : 0)), 0) / updatedSubs.length)
            : t.progress

          return {
            ...t,
            subtasks: updatedSubs,
            status: allDone ? 'done' : (avgProg >= 100 ? 'review' : (avgProg > 0 ? 'in_progress' : t.status)),
            progress: avgProg
          }
        }
        return t
      })
    )

    try {
      if (task.source === 'apec' || String(task.id).startsWith('apec_') || !isNaN(Number(task.id))) {
        if (targetChecked && subtask.ea_id) {
          const cleanEaId = Number(String(subtask.ea_id).replace(/^[^\d]+/, ''))
          if (!isNaN(cleanEaId) && cleanEaId > 0) {
            await fetch('/api/v1/apec-global/approve', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_assignment_id: cleanEaId })
            }).catch(() => {})
          }
        }
        if (subtask.raw_id && !isNaN(Number(subtask.raw_id))) {
          await fetch('/api/v1/apec-global/assignments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: Number(subtask.raw_id),
              process: targetProgress,
              status: targetChecked ? { id: 4, name: 'Hoàn thành' } : { id: 2, name: 'Đang thực hiện' }
            })
          }).catch(() => {})
        }
      } else {
        // Supabase task / checklist item
        try {
          await supabase
            .from('tasks')
            .update({
              status: targetStatus,
              progress_percentage: targetProgress,
              updated_at: new Date().toISOString()
            })
            .eq('id', subtask.id)
        } catch {}
      }

      showToast('success', `${targetChecked ? 'Đã duyệt hoàn thành' : 'Đã chuyển về đang làm'}: "${subtask.title}"`, 'Cập nhật việc con')
    } catch (err: any) {
      console.error('Lỗi toggle subtask:', err)
      showToast('error', `Lỗi khi cập nhật việc con: ${err.message}`)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(subKey)
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

  // Handler: Xuất dữ liệu Excel chuẩn theo đúng bộ lọc đang chọn ("Lọc sao tải vậy")
  const handleExportExcel = async () => {
    if (filteredTasks.length === 0) {
      showToast('info', 'Không có dữ liệu công việc phù hợp với bộ lọc hiện tại để xuất Excel.')
      return
    }

    setIsExporting(true)
    try {
      const ExcelJSModule = await import('exceljs')
      const Workbook = ExcelJSModule.Workbook || ExcelJSModule.default?.Workbook || (ExcelJSModule as any)
      const { saveAs } = await import('file-saver')

      const wb = new Workbook()
      const ws = wb.addWorksheet('Bảng Giám Sát Công Việc', {
        views: [{ showGridLines: true }]
      })

      // Tiêu đề lớn đầu trang
      ws.mergeCells('A1:L1')
      const titleCell = ws.getCell('A1')
      titleCell.value = 'BẢNG GIÁM SÁT & DUYỆT CÔNG VIỆC THEO PHÒNG BAN'
      titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
      }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      ws.getRow(1).height = 38

      // Khối tóm tắt bộ lọc đã chọn ("Lọc sao thì tải vậy")
      const nowStr = new Date().toLocaleString('vi-VN')
      const selectedDeptName = selectedDepartment === 'all' ? 'Tất cả Phòng Ban' : selectedDepartment
      const selectedProjName = selectedProject === 'all' ? 'Tất cả Dự Án' : (projects.find(p => String(p.id) === selectedProject)?.name || selectedProject)
      const selectedTypeName = selectedChecklistType === 'all' ? 'Tất cả Loại Checklist' : selectedChecklistType
      const statusLabels: Record<string, string> = {
        all: 'Tất cả trạng thái',
        review: 'Chờ duyệt (100%)',
        in_progress: 'Đang thực hiện',
        todo: 'Chưa thực hiện',
        done: 'Hoàn thành / Đã duyệt',
        overdue: 'Quá hạn'
      }
      const selectedStatusLabel = statusLabels[selectedStatus] || selectedStatus
      const tabLabels: Record<string, string> = {
        all: 'Tất cả',
        review: 'Chờ duyệt',
        in_progress: 'Đang làm',
        overdue: 'Quá hạn',
        done: 'Hoàn thành'
      }

      ws.addRow([]) // Dòng 2 trống
      ws.addRow(['Thời gian xuất:', nowStr, '', 'Phòng ban lọc:', selectedDeptName, '', 'Dự án lọc:', selectedProjName])
      ws.addRow(['Tab xem:', tabLabels[activeTab] || activeTab, '', 'Trạng thái lọc:', selectedStatusLabel, '', 'Loại Checklist:', selectedTypeName])
      if (searchQuery.trim()) {
        ws.addRow(['Từ khóa tìm kiếm:', searchQuery, '', 'Tổng số công việc:', `${filteredTasks.length} công việc`])
      } else {
        ws.addRow(['Tổng số công việc:', `${filteredTasks.length} công việc`])
      }
      ws.addRow([]) // Dòng trống trước bảng

      // Style cho các dòng metadata
      for (let r = 3; r <= (searchQuery.trim() ? 6 : 5); r++) {
        const row = ws.getRow(r)
        row.font = { name: 'Arial', size: 9, italic: true }
        row.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } }
        row.getCell(4).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } }
        row.getCell(7).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } }
      }

      // Headers của bảng
      const headerRowNumber = searchQuery.trim() ? 7 : 6
      const headers = [
        'STT',
        'Tên Công Việc',
        'Phân Loại',
        'Dự Án',
        'Loại Checklist / Nhiệm Vụ',
        'Phòng Ban',
        'Người Phụ Trách',
        'Ngày Bắt Đầu',
        'Hạn Chót',
        'Tiến Độ',
        'Trạng Thái',
        'Nguồn Dữ Liệu'
      ]

      const headerRow = ws.getRow(headerRowNumber)
      headerRow.values = headers
      headerRow.height = 28
      headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }

      for (let c = 1; c <= headers.length; c++) {
        const cell = headerRow.getCell(c)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' } // Primary Blue
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        }
      }

      // Đổ dữ liệu các công việc & công việc con vào Excel
      let parentStt = 1

      filteredTasks.forEach(task => {
        const isDone = task.status === 'done'
        const isReview = task.status === 'review'
        const isOverdue = task.due_date && !isDone && !isReview && new Date(task.due_date) < new Date()
        const statusText = isReview
          ? '⏳ Chờ duyệt (100%)'
          : isDone
          ? '✅ Đã hoàn thành'
          : task.status === 'in_progress'
          ? '⚡ Đang thực hiện'
          : isOverdue
          ? '⚠️ Quá hạn'
          : '📋 Chưa thực hiện'

        const assigneeNames = task.assignees && task.assignees.length > 0
          ? task.assignees.map(a => a.full_name).filter(Boolean).join(', ')
          : (task.assignee?.full_name || 'Việc chung / Chưa phân công')

        const taskTypeLabel = task.task_type === 'personal'
          ? 'Việc riêng'
          : (task.task_type === 'shared' || (!task.assignee && (!task.assignees || task.assignees.length === 0)) ? 'Việc chung' : 'Việc chung')

        // Thêm hàng công việc cha
        const pRow = ws.addRow([
          parentStt,
          task.title,
          taskTypeLabel,
          task.project_name || 'Dự án',
          task.checklist_title || 'Nhiệm vụ chung',
          task.department_name || 'Chung',
          assigneeNames,
          task.start_date ? formatVietnamDate(task.start_date) : '',
          task.due_date ? formatVietnamDate(task.due_date) : '',
          `${task.progress}%`,
          statusText,
          task.source === 'apec' ? 'APEC Global' : 'Nội bộ'
        ])

        pRow.height = 24
        pRow.font = { name: 'Arial', size: 10, bold: true }

        for (let c = 1; c <= headers.length; c++) {
          const cell = pRow.getCell(c)
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          }
          if (c === 1 || c === 3 || c === 8 || c === 9 || c === 10 || c === 11 || c === 12) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
          }
          if (isReview) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }
          } else if (isDone) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
          }
        }

        // Nếu công việc cha có các công việc con (Subtasks), thêm các hàng con thụt dòng
        if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
          task.subtasks.forEach((sub, sIdx) => {
            const isSubDone = Boolean(sub.checked || sub.status === 'done' || (sub.progress && sub.progress >= 100))
            const subStatusText = isSubDone ? '✅ Hoàn thành' : ((sub.progress && sub.progress > 0) ? '⚡ Đang thực hiện' : '📋 Chưa làm')
            const subAssignee = sub.assignee?.full_name || task.assignee?.full_name || 'Theo việc cha'

            const cRow = ws.addRow([
              `${parentStt}.${sIdx + 1}`,
              `    ↳ [Việc con] ${sub.title}`,
              'Việc con',
              task.project_name || 'Dự án',
              task.checklist_title || 'Nhiệm vụ chung',
              task.department_name || 'Chung',
              subAssignee,
              sub.start_date ? formatVietnamDate(sub.start_date) : (task.start_date ? formatVietnamDate(task.start_date) : ''),
              sub.due_date ? formatVietnamDate(sub.due_date) : (task.due_date ? formatVietnamDate(task.due_date) : ''),
              `${sub.progress ?? (isSubDone ? 100 : 0)}%`,
              subStatusText,
              task.source === 'apec' ? 'APEC Global' : 'Nội bộ'
            ])

            cRow.height = 20
            cRow.font = { name: 'Arial', size: 9, italic: true }

            for (let c = 1; c <= headers.length; c++) {
              const cell = cRow.getCell(c)
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
              cell.border = {
                top: { style: 'dotted', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'dotted', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
              }
              if (c === 1 || c === 3 || c === 8 || c === 9 || c === 10 || c === 11 || c === 12) {
                cell.alignment = { vertical: 'middle', horizontal: 'center' }
              } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left' }
              }
            }
          })
        }

        parentStt++
      })

      // Độ rộng cột
      ws.columns = [
        { width: 8 },  // STT
        { width: 38 }, // Tên công việc
        { width: 14 }, // Phân loại
        { width: 22 }, // Dự án
        { width: 24 }, // Loại Checklist
        { width: 20 }, // Phòng ban
        { width: 22 }, // Người phụ trách
        { width: 14 }, // Ngày bắt đầu
        { width: 14 }, // Hạn chót
        { width: 12 }, // Tiến độ
        { width: 22 }, // Trạng thái
        { width: 14 }, // Nguồn
      ]

      const buffer = await wb.xlsx.writeBuffer()
      const cleanDept = selectedDepartment !== 'all' ? `_${selectedDepartment.replace(/[\/\\]/g, '-')}` : ''
      const dateStr = new Date().toISOString().slice(0, 10)
      const filename = `BaoCao_GiamSat_CongViec${cleanDept}_${dateStr}.xlsx`

      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
      showToast('success', `Đã xuất ${filteredTasks.length} công việc ra file: ${filename}`, 'Xuất Excel thành công')
    } catch (err: any) {
      console.error('Lỗi xuất Excel:', err)
      showToast('error', `Lỗi khi xuất file Excel: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
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
    const isReview = status === 'review'
    const isOverdue = dueDate && status !== 'done' && status !== 'review' && new Date(dueDate) < now

    if (isReview) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          ⏳ Chờ duyệt (100%)
        </span>
      )
    }

    if (status === 'done') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Đã hoàn thành / Đã duyệt
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

  // Helper render thời gian hạn chót chi tiết & trực quan
  const renderDeadlineBadge = (startDateInput?: string | null, dueDateInput?: string | null, isDone?: boolean) => {
    const sStr = getVietnamDateString(startDateInput) || null;
    let dStr = getVietnamDateString(dueDateInput) || null;
    if (sStr && dStr && dStr < sStr) {
      dStr = sStr;
    }
    if (!dStr && sStr) {
      dStr = sStr;
    }

    if (!dStr && !sStr) {
      return (
        <div className="flex flex-col text-[11px] text-slate-400">
          <span className="italic flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            Chưa đặt hạn
          </span>
        </div>
      )
    }

    const todayStr = getVietnamDateString();
    let daysDiff: number | null = null;
    let isOverdue = false;
    let isToday = false;

    if (dStr) {
      const dNow = parseToVietnamDate(todayStr);
      const dDue = parseToVietnamDate(dStr);
      if (dNow && dDue) {
        dNow.setHours(0, 0, 0, 0);
        dDue.setHours(0, 0, 0, 0);
        const diffTime = dDue.getTime() - dNow.getTime();
        daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
        isToday = daysDiff === 0;
        isOverdue = daysDiff < 0;
      }
    }

    return (
      <div className="flex flex-col gap-1 text-[11px]">
        {dStr ? (
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Hạn: {formatVietnamDate(dStr)}</span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            Chưa có hạn chót
          </div>
        )}

        {sStr && (
          <div className="text-[10px] text-slate-500 font-medium pl-5">
            Bắt đầu: {formatVietnamDate(sStr)}
          </div>
        )}

        {!isDone && dStr && daysDiff !== null && (
          <div className="pl-5">
            {isOverdue ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Quá hạn {Math.abs(daysDiff)} ngày
              </span>
            ) : isToday ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                <Clock className="w-3 h-3 text-amber-600" />
                Hạn hôm nay!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Clock className="w-3 h-3 text-emerald-600" />
                Còn {daysDiff} ngày
              </span>
            )}
          </div>
        )}
      </div>
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

  // Helper render màu và icon badge loại checklist
  const getChecklistTypeBadgeStyle = (typeName?: string) => {
    if (!typeName) return { bg: 'bg-slate-50 text-slate-700 border-slate-200', iconColor: 'text-slate-500' }
    const upper = typeName.toUpperCase().trim()
    if (upper.includes('CẢI TIẾN') || upper.includes('NÂNG CẤP') || upper.includes('IMPROVEMENT')) {
      return { bg: 'bg-amber-50 text-amber-800 border-amber-200', iconColor: 'text-amber-600' }
    }
    if (upper.includes('SỰ CỐ') || upper.includes('RỦI RO') || upper.includes('INCIDENT') || upper.includes('RISK')) {
      return { bg: 'bg-rose-50 text-rose-800 border-rose-200', iconColor: 'text-rose-600' }
    }
    if (upper.includes('NHẬT KÝ') || upper.includes('CHUYÊN MÔN') || upper.includes('LOG')) {
      return { bg: 'bg-blue-50 text-blue-800 border-blue-200', iconColor: 'text-blue-600' }
    }
    if (upper.includes('HẰNG NGÀY') || upper.includes('DAILY') || upper.includes('THƯỜNG XUYÊN')) {
      return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', iconColor: 'text-emerald-600' }
    }
    if (upper.includes('MỤC TIÊU') || upper.includes('DỰ ÁN') || upper.includes('TARGET') || upper.includes('GOAL')) {
      return { bg: 'bg-purple-50 text-purple-800 border-purple-200', iconColor: 'text-purple-600' }
    }
    if (upper.includes('KẾ HOẠCH') || upper.includes('GIAI ĐOẠN') || upper.includes('PHASE') || upper.includes('PLAN')) {
      return { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', iconColor: 'text-cyan-600' }
    }
    return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconColor: 'text-indigo-600' }
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-6 shadow-sm border border-slate-200/80 mb-8 transition-all">
      {/* ─── HEADER: TITLE & STATS COUNTER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 sm:pb-5 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 mt-0.5 sm:mt-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
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
              Theo dõi và phê duyệt trực tiếp toàn bộ công việc của các Phòng ban trong tất cả dự án (Bao gồm việc chung & việc riêng)
            </p>
          </div>
        </div>

        {/* Action buttons & export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canApprove && selectedTaskIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {isBulkApproving ? 'Đang duyệt...' : `Duyệt (${selectedTaskIds.size}) mục đã chọn`}
            </button>
          )}

          {/* Nút Xuất File Excel theo đúng bộ lọc đang chọn */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting || filteredTasks.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm hover:border-slate-400 active:scale-95 transition-all disabled:opacity-50"
            title="Tải về file Excel danh sách công việc theo đúng bộ lọc đang chọn (lọc sao tải vậy)"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-600 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Đang xuất Excel...' : `Xuất Excel (${filteredTasks.length})`}
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          )}
        </div>
      </div>

      {/* ─── FILTERS TOOLBAR ─── */}
      <div className="space-y-3.5 pt-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 custom-scrollbar -mx-1 px-1">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
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
                <option value="all">Tất cả Phòng Ban ({departmentOptions.reduce((acc, d) => acc + d.count, 0)})</option>
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
                <option value="all">Tất cả Dự Án ({projectOptions.reduce((acc, p) => acc + p.count, 0)})</option>
                {projectOptions.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Lọc theo Loại Checklist */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Loại Checklist ({checklistTypeOptions.length})
            </label>
            <div className="relative">
              <CheckSquare className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedChecklistType}
                onChange={e => { setSelectedChecklistType(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Tất cả Loại Checklist ({checklistTypeOptions.reduce((acc, c) => acc + c.count, 0)})</option>
                {checklistTypeOptions.map(ct => (
                  <option key={ct.id} value={ct.name}>
                    {ct.name} ({ct.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Lọc theo Trạng thái */}
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

          {/* 5. Tìm kiếm từ khóa */}
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
                  disabled={!canApprove || reviewTasksOnPage.length === 0}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                  title={canApprove ? "Chọn tất cả mục chờ duyệt trên trang" : "Bạn không có quyền duyệt công việc"}
                />
              </th>
              <th className="py-3 px-4 min-w-[240px]">Tên Công Việc</th>
              <th className="py-3 px-4 min-w-[150px]">Dự Án</th>
              <th className="py-3 px-4 min-w-[150px]">Loại Checklist</th>
              <th className="py-3 px-4 min-w-[140px]">Phòng Ban</th>
              <th className="py-3 px-4 min-w-[150px]">Người Thực Hiện</th>
              <th className="py-3 px-4 min-w-[130px]">Thời Gian / Hạn Chót</th>
              <th className="py-3 px-4 min-w-[160px]">Tiến Độ & Trạng Thái</th>
              <th className="py-3 px-4 min-w-[150px] text-right">Thao Tác Duyệt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy công việc nào phù hợp</p>
                    <p className="text-xs text-slate-400">Thử thay đổi bộ lọc Phòng ban, Loại checklist, Trạng thái hoặc từ khóa tìm kiếm</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task, idx) => {
                const isReview = task.status === 'review'
                const isProcessing = processingIds.has(task.id)
                const isChecked = selectedTaskIds.has(task.id)
                const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0
                const isExpanded = expandedTaskIds.has(task.id)
                const completedSubtasksCount = hasSubtasks ? task.subtasks!.filter(s => s.checked || s.status === 'done' || (s.progress && s.progress >= 100)).length : 0

                return (
                  <React.Fragment key={`${task.source}_${task.id}_${idx}`}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isReview ? 'bg-amber-50/20' : ''
                      } ${isExpanded ? 'bg-blue-50/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectTask(task.id)}
                          disabled={!canApprove || !isReview}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-20"
                          title={!canApprove ? "Bạn không có quyền duyệt" : undefined}
                        />
                      </td>

                      {/* Tên công việc (Kèm nút Dropdown xem việc con nằm ngay sau tên công việc) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 leading-snug">
                            {task.title}
                          </span>

                          {/* Nút hiển thị số lượng công việc con & Click để dropdown */}
                          {hasSubtasks && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpandTask(task.id)
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer select-none shrink-0 ${
                                isExpanded
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-2xs'
                              }`}
                              title={isExpanded ? "Thu gọn danh sách việc con" : "Xem chi tiết các việc con"}
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                              <span>{completedSubtasksCount}/{task.subtasks!.length} việc con</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>

                        {/* Badges nguồn, việc chung/riêng, mức ưu tiên */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            task.source === 'apec' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.source === 'apec' ? 'APEC Global' : 'Nội bộ'}
                          </span>

                          {task.task_type === 'shared' || (!task.assignee && (!task.assignees || task.assignees.length === 0)) ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Việc chung
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              Việc riêng
                            </span>
                          )}

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

                      {/* Loại Checklist */}
                      <td className="py-3.5 px-4">
                        {task.checklist_title ? (
                          (() => {
                            const badgeStyle = getChecklistTypeBadgeStyle(task.checklist_title)
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badgeStyle.bg} max-w-[170px] shadow-xs`}>
                                <CheckSquare className={`w-3.5 h-3.5 flex-shrink-0 ${badgeStyle.iconColor}`} />
                                <span className="truncate" title={task.checklist_title}>
                                  {task.checklist_title}
                                </span>
                              </span>
                            )
                          })()
                        ) : (
                          <span className="text-slate-400 text-xs italic">Nhiệm vụ chung</span>
                        )}
                      </td>

                      {/* Phòng Ban */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getDepartmentColor(task.department_name)}`}>
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="line-clamp-1">{task.department_name || 'Chung'}</span>
                        </span>
                      </td>

                      {/* Người thực hiện (Hiển thị đa nhân sự nếu là việc chung nhiều người) */}
                      <td className="py-3.5 px-4">
                        {task.assignees && task.assignees.length > 1 ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              {task.assignees.slice(0, 3).map((a, aIdx) => (
                                a.avatar_url ? (
                                  <img key={aIdx} src={a.avatar_url} alt={a.full_name || ''} className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" />
                                ) : (
                                  <div key={aIdx} className="inline-flex h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 items-center justify-center text-[10px] font-bold text-slate-700">
                                    {a.full_name ? a.full_name.charAt(0) : 'U'}
                                  </div>
                                )
                              ))}
                              {task.assignees.length > 3 && (
                                <span className="inline-flex h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 items-center justify-center text-[9px] font-bold text-slate-600">
                                  +{task.assignees.length - 3}
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-slate-800 text-[11px] line-clamp-1" title={task.assignees.map(a => a.full_name).join(', ')}>
                              {task.assignees.map(a => a.full_name).join(', ')}
                            </span>
                          </div>
                        ) : (
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
                              {task.assignee?.full_name || 'Việc chung / Chưa phân công'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Thời gian / Hạn chót */}
                      <td className="py-3.5 px-4 min-w-[150px]">
                        {renderDeadlineBadge(task.start_date, task.due_date, task.status === 'done')}
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
                          canApprove ? (
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
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Chờ quản lý duyệt
                            </span>
                          )
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

                    {/* ─── EXPANDED SUBTASKS ACCORDION ROW ─── */}
                    {isExpanded && hasSubtasks && (
                      <tr className="bg-slate-50/80 border-t border-b border-blue-100/90">
                        <td colSpan={9} className="p-0">
                          <div className="p-3.5 sm:p-4 pl-6 sm:pl-12 bg-gradient-to-r from-blue-50/50 via-slate-50/60 to-white">
                            {/* Tiêu đề & tóm tắt công việc con */}
                            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200/80">
                              <div className="flex items-center gap-2">
                                <CornerDownRight className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                  Danh sách công việc con ({task.subtasks!.length} hạng mục)
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                                  • Đã hoàn thành: <strong className="text-emerald-600">{completedSubtasksCount}</strong>/{task.subtasks!.length} việc con
                                </span>
                              </div>
                            </div>

                            {/* Danh sách từng công việc con */}
                            <div className="space-y-1.5">
                              {task.subtasks!.map((sub, sIdx) => {
                                const isSubDone = Boolean(sub.checked || sub.status === 'done' || (sub.progress && sub.progress >= 100))
                                const isSubProcessing = processingIds.has(`sub_${sub.id}`)
                                const subAssignee = sub.assignee || task.assignee

                                return (
                                  <div
                                    key={sub.id || sIdx}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                                      isSubDone
                                        ? 'bg-emerald-50/40 border-emerald-200/60'
                                        : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-2xs'
                                    }`}
                                  >
                                    {/* STT & Tên việc con */}
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {sIdx + 1}
                                      </span>
                                      <span className={`font-semibold text-slate-800 ${isSubDone ? 'line-through text-slate-400' : ''}`}>
                                        {sub.title}
                                      </span>
                                    </div>

                                    {/* Người thực hiện việc con, Hạn chót & Tiến độ */}
                                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-[11px] flex-wrap justify-between sm:justify-end">
                                      {subAssignee && (
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                          {subAssignee.avatar_url ? (
                                            <img src={subAssignee.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                          ) : (
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                          )}
                                          <span className="font-medium truncate max-w-[130px]">{subAssignee.full_name}</span>
                                        </div>
                                      )}

                                      {sub.due_date && (
                                        <div className="flex items-center gap-1 text-slate-500">
                                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                          <span>{formatVietnamDate(sub.due_date)}</span>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                          isSubDone
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : (sub.progress && sub.progress > 0)
                                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                          {isSubDone ? 'Đã hoàn thành' : `${sub.progress || 0}%`}
                                        </span>

                                        {/* Nút Duyệt / Đánh dấu hoàn thành việc con */}
                                        {canApprove && (
                                          <button
                                            type="button"
                                            disabled={isSubProcessing}
                                            onClick={() => handleToggleSubtask(task, sub, sIdx)}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                              isSubDone
                                                ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                            }`}
                                            title={isSubDone ? "Đánh dấu chưa hoàn thành" : "Duyệt hoàn thành việc con này"}
                                          >
                                            <CheckCircle2 className="w-3 h-3" />
                                            {isSubProcessing ? '...' : (isSubDone ? 'Hủy duyệt' : 'Duyệt')}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
