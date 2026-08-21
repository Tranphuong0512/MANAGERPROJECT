/**
 * ============================================================================
 * TASK NORMALIZER — Single Source of Truth
 * ============================================================================
 * Chuẩn hóa tasks từ 3 nguồn khác nhau về cùng 1 `NormalizedTask` shape:
 * 1. Supabase `tasks` table
 * 2. Supabase `checklist_items` table
 * 3. APEC Global API tasks
 *
 * Đây là module DUY NHẤT xử lý data transformation cho tasks.
 * Dashboard page.tsx và mọi component khác sẽ import từ đây.
 */

import type {
  NormalizedTask,
  NormalizedSubtask,
  ResolvedAssignee,
  LookupMaps,
  NormalizedProject,
  RawEmployeeAssignment,
  RawApecSubtask,
  WidgetTask,
  TaskPriority,
} from './types'

import {
  resolveSupabaseTaskStatus,
  resolveChecklistItemStatus,
  resolveApecTaskStatus,
  resolveSubtaskStatus,
  resolveProgress,
} from './status-resolver'

import {
  resolveSupabaseAssignee,
  resolveChecklistAssignees,
  resolveApecAssignees,
  resolveDepartment,
} from './assignee-resolver'

// ─── 1. Normalize Supabase Tasks ────────────────────────────────────────────

export function normalizeSupabaseTasks(
  rawTasks: Record<string, unknown>[],
  maps: LookupMaps,
): NormalizedTask[] {
  // Gom tasks con theo parent_task_id
  const childrenMap = new Map<string, NormalizedSubtask[]>()

  rawTasks.forEach((t: any) => {
    if (t.parent_task_id) {
      const pId = String(t.parent_task_id)
      if (!childrenMap.has(pId)) childrenMap.set(pId, [])

      const status = resolveSupabaseTaskStatus({
        status: t.status,
        is_completed: t.is_completed,
        progress_percentage: t.progress_percentage,
      })
      const progress = resolveProgress({ progress: t.progress_percentage, status })

      childrenMap.get(pId)!.push({
        id: String(t.id),
        raw_id: t.id,
        title: t.title,
        status,
        progress,
        process: progress,
        checked: status === 'done',
        assignee: t.assigned_user ? {
          id: t.assigned_user.id,
          full_name: t.assigned_user.full_name,
          avatar_url: t.assigned_user.avatar_url,
        } : undefined,
        start_date: t.start_date || t.created_at || null,
        due_date: t.due_date || null,
      })
    }
  })

  // Chỉ lấy tasks gốc (không có parent)
  return rawTasks
    .filter((t: any) => !t.parent_task_id)
    .map((t: any) => {
      const prj = t.projects || maps.projectMap.get(String(t.project_id))

      const status = resolveSupabaseTaskStatus({
        status: t.status,
        is_completed: t.is_completed,
        progress_percentage: t.progress_percentage,
      })
      const progress = resolveProgress({ progress: t.progress_percentage, status })

      const assignee = resolveSupabaseAssignee({
        assigned_user: t.assigned_user,
        assigned_to: t.assigned_to,
        maps,
      })

      const dept = resolveDepartment({
        primaryAssignee: assignee,
        project: prj ? mapRawProjectToNormalized(prj) : null,
        maps,
      })

      const startDate = t.start_date || t.date_start || t.created_at || null
      const dueDate = t.due_date || t.end_date || t.date_end || t.finish_date || t.completed_date || t.target_date || null
      const subtasks = childrenMap.get(String(t.id)) || []

      return {
        id: t.id,
        raw_id: t.id,
        title: t.title,
        project_id: prj?.id || t.project_id,
        project_name: prj?.name || 'Dự án nội bộ',
        department_id: dept.id,
        department_name: dept.name,
        checklist_title: t.category || t.type || t.task_type || 'Nhiệm vụ chung',
        assignee,
        assignees: assignee ? [assignee] : [],
        start_date: startDate,
        due_date: dueDate,
        progress,
        status,
        priority: (t.priority || 'medium') as TaskPriority,
        source: 'supabase' as const,
        _table: 'tasks' as const,
        subtasks,
        task_type: assignee ? 'personal' : 'shared',
      } satisfies NormalizedTask
    })
}

// ─── 2. Normalize Checklist Items ───────────────────────────────────────────

export function normalizeChecklistItems(
  rawItems: Record<string, unknown>[],
  maps: LookupMaps,
): NormalizedTask[] {
  return rawItems
    .filter((t: any) => !t.project_checklists?.deleted_at)
    .map((t: any) => {
      const prj = t.project_checklists?.projects || maps.projectMap.get(String(t.project_checklists?.project_id || t.project_id))

      const rawSt = typeof t.status === 'object' ? t.status?.name || t.status?.id : t.status
      const status = resolveChecklistItemStatus({
        status: rawSt,
        task_status: t.task_status,
        is_completed: t.is_completed,
        progress: t.progress,
      })
      const progress = resolveProgress({ progress: t.progress, status })

      const assignees = resolveChecklistAssignees({
        assignee: t.assignee,
        assigned_staff_id: t.assigned_staff_id,
        assignee_ids: t.assignee_ids,
        maps,
      })

      const primaryAssignee = assignees[0] || undefined

      const dept = resolveDepartment({
        primaryAssignee,
        project: prj ? mapRawProjectToNormalized(prj) : null,
        maps,
      })

      const startDate = t.start_date || t.date_start || t.created_at || null
      const dueDate = t.end_date || t.due_date || t.date_end || t.completed_date || t.finish_date || null

      return {
        id: t.id,
        raw_id: t.id,
        title: t.title,
        project_id: prj?.id || t.project_checklists?.project_id || t.project_id,
        project_name: prj?.name || 'Dự án nội bộ',
        department_id: dept.id,
        department_name: dept.name,
        checklist_title: t.project_checklists?.title || t.project_checklists?.name || 'Checklist dự án',
        assignee: primaryAssignee,
        assignees,
        start_date: startDate,
        due_date: dueDate,
        progress,
        status,
        priority: (t.priority || 'medium') as TaskPriority,
        source: 'supabase' as const,
        _table: 'checklist_items' as const,
        subtasks: [],
        task_type: assignees.length > 0 ? 'personal' : 'shared',
      } satisfies NormalizedTask
    })
}

// ─── 3. Normalize APEC Tasks ────────────────────────────────────────────────

export function normalizeApecTasks(
  rawTasks: Record<string, unknown>[],
  maps: LookupMaps,
): NormalizedTask[] {
  return rawTasks.map((t: any) => {
    const ea: RawEmployeeAssignment[] = Array.isArray(t.employee_assignments) ? t.employee_assignments : []
    const parentProcess = Number(t.progress ?? t.process ?? 0)

    const status = resolveApecTaskStatus({
      status: t.status || t.task_status,
      task_status: t.task_status,
      is_completed: t.is_completed,
      process: parentProcess,
      employee_assignments: ea,
    })

    // Resolve assignees
    const assignees = resolveApecAssignees(ea, t.employee, maps)
    const primaryAssignee = assignees[0] || undefined

    // Resolve department
    const pId = t.project_id || t.project?.id
    const prj = pId ? maps.projectMap.get(String(pId)) : null

    const dept = resolveDepartment({
      primaryAssignee,
      directDepartment: t.department,
      directDepartmentName: t.department_name || t.project?.department_name,
      directDepartmentId: t.department_id || t.department?.id,
      project: prj || null,
      maps,
    })

    // Resolve dates
    let startDate: string | null = t.date_start || t.start_date || t.created_at || null
    let dueDate: string | null = t.date_end || t.end_date || t.due_date || t.completed_date || t.finish_date || t.target_date || null

    // Fallback dates from employee_assignments
    if (ea.length > 0) {
      for (const assign of ea) {
        if (!dueDate && (assign.completed_date || assign.date_end || assign.end_date || assign.due_date)) {
          dueDate = (assign.completed_date || assign.date_end || assign.end_date || assign.due_date) as string
        }
        if (!startDate && (assign.date_start || assign.start_date)) {
          startDate = (assign.date_start || assign.start_date) as string
        }
      }
    }

    // Resolve subtasks
    const subtasks = normalizeApecSubtasks(t, ea, primaryAssignee)

    // Fallback due_date from subtasks
    if (!dueDate && subtasks.length > 0) {
      const subWithDate = subtasks.find(s => s.due_date)
      if (subWithDate) dueDate = subWithDate.due_date
    }

    // Resolve checklist type
    const checklistType = (typeof t.type === 'object' ? t.type?.name : t.type_name)
      || t.type_task?.name
      || t.checklist_title
      || (t.is_incident ? 'SỰ CỐ & RỦI RO' : (t.is_improvement ? 'CẢI TIẾN & NÂNG CẤP' : 'NHẬT KÝ CHUYÊN MÔN'))

    return {
      id: `apec_${t.id}`,
      raw_id: t.id,
      title: t.name || t.title || 'Nhiệm vụ',
      project_id: pId,
      project_name: prj?.name || t.project?.name || t.project_name || 'Dự án APEC',
      department_id: dept.id,
      department_name: dept.name,
      checklist_title: checklistType,
      assignee: primaryAssignee,
      assignees,
      start_date: startDate,
      due_date: dueDate,
      progress: parentProcess,
      status,
      priority: (t.priority?.name?.toLowerCase()?.includes('cao') ? 'high' : 'medium') as TaskPriority,
      source: 'apec' as const,
      employee_assignments: ea,
      subtasks,
      task_type: assignees.length > 1 ? 'shared' : (assignees.length === 1 ? 'personal' : 'shared'),
    } satisfies NormalizedTask
  })
}

// ─── 4. Merge & Deduplicate ─────────────────────────────────────────────────

export function mergeAndDeduplicateTasks(...taskArrays: NormalizedTask[][]): NormalizedTask[] {
  const seen = new Set<string>()
  const result: NormalizedTask[] = []

  for (const tasks of taskArrays) {
    for (const t of tasks) {
      const key = `${t.source}_${t.raw_id || t.id}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(t)
      }
    }
  }

  return result
}

// ─── 5. Convert to Widget Tasks ─────────────────────────────────────────────

export function toWidgetTasks(tasks: NormalizedTask[]): WidgetTask[] {
  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    project_id: t.project_id,
    projects: { name: t.project_name },
    assignee: t.assignee,
  }))
}

// ─── Internal: Normalize APEC Subtasks ──────────────────────────────────────

function normalizeApecSubtasks(
  task: any,
  employeeAssignments: RawEmployeeAssignment[],
  fallbackAssignee?: ResolvedAssignee,
): NormalizedSubtask[] {
  const subtasksMap = new Map<string, NormalizedSubtask>()

  // From task.subtasks
  if (Array.isArray(task.subtasks)) {
    task.subtasks.forEach((st: RawApecSubtask, idx: number) => {
      const stId = String(st.id || `sub_${task.id}_${idx}`)
      const subStatus = resolveSubtaskStatus({
        checked: st.checked,
        status: st.status,
        process: Number(st.process ?? st.progress ?? 0),
      })
      const subProc = Number(st.process ?? st.progress ?? (subStatus === 'done' ? 100 : 0))

      subtasksMap.set(stId, {
        id: stId,
        raw_id: st.id,
        title: st.name || st.title || `Công việc con #${idx + 1}`,
        status: subStatus,
        progress: subProc,
        process: subProc,
        checked: subStatus === 'done',
        assignee: st.employee
          ? { id: st.employee.id, full_name: st.employee.fullname || st.employee.name || '', avatar_url: st.employee.avatar }
          : fallbackAssignee,
        start_date: st.date_start || st.start_date || null,
        due_date: st.date_end || st.end_date || st.due_date || st.completed_date || null,
        task_id: task.id,
      })
    })
  }

  // From employee_assignments[].subtasks
  employeeAssignments.forEach(assign => {
    const eaEmp = assign.employee
    const eaAssignee: ResolvedAssignee | undefined = eaEmp
      ? { id: eaEmp.id, full_name: eaEmp.fullname || eaEmp.name || '', avatar_url: eaEmp.avatar }
      : fallbackAssignee

    if (Array.isArray(assign.subtasks) && assign.subtasks.length > 0) {
      assign.subtasks.forEach((st: RawApecSubtask, idx: number) => {
        const stId = String(st.id || `ea_sub_${assign.id}_${idx}`)
        const subStatus = resolveSubtaskStatus({
          checked: st.checked,
          status: st.status,
          process: Number(st.process ?? st.progress ?? 0),
        })
        const subProc = Number(st.process ?? st.progress ?? (subStatus === 'done' ? 100 : 0))

        subtasksMap.set(stId, {
          id: stId,
          raw_id: st.id,
          title: st.name || st.title || `Công việc con #${idx + 1}`,
          status: subStatus,
          progress: subProc,
          process: subProc,
          checked: subStatus === 'done',
          assignee: st.employee
            ? { id: st.employee.id, full_name: st.employee.fullname || st.employee.name || '', avatar_url: st.employee.avatar }
            : eaAssignee,
          start_date: st.date_start || st.start_date || (assign.date_start as string) || null,
          due_date: st.date_end || st.end_date || st.due_date || st.completed_date || (assign.date_end as string) || (assign.due_date as string) || null,
          ea_id: assign.id,
          task_id: task.id,
        })
      })
    }
  })

  return Array.from(subtasksMap.values())
}

// ─── Internal: Quick project shape converter ────────────────────────────────

function mapRawProjectToNormalized(prj: any): NormalizedProject {
  return {
    id: prj.id,
    name: prj.name,
    code: prj.code,
    status: prj.status || 'active',
    start_date: prj.start_date || null,
    end_date: prj.end_date || null,
    department_name: prj.departments?.name || prj.department_name,
    department_id: prj.department_id || prj.departments?.id,
    progress_percentage: Number(prj.progress_percentage || prj.process || prj.progress || 0),
    departments: prj.departments,
  }
}
