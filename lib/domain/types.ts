/**
 * ============================================================================
 * DOMAIN TYPES — Single Source of Truth
 * ============================================================================
 * Thay thế toàn bộ `any` types dùng trong dashboard, tasks, APEC sync.
 * Mọi data từ Supabase, APEC Global, checklist_items đều normalize về các
 * type này trước khi truyền vào UI components.
 */

// ─── Data Source ──────────────────────────────────────────────────────────────
export type DataSource = 'supabase' | 'apec'
export type SupabaseTable = 'tasks' | 'checklist_items'

// ─── Status Enums ─────────────────────────────────────────────────────────────
export type NormalizedTaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
export type NormalizedProjectStatus = 'planning' | 'active' | 'completed' | 'archived' | 'overdue'
export type NormalizedIncidentStatus = 'new' | 'investigating' | 'review' | 'resolved' | 'closed'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskType = 'shared' | 'personal'

// ─── Resolved Assignee ───────────────────────────────────────────────────────
export interface ResolvedAssignee {
  id: string | number
  full_name: string
  avatar_url?: string
  department_name?: string
  department_id?: string | number
  ea_id?: string | number
}

// ─── Department Info ──────────────────────────────────────────────────────────
export interface DepartmentInfo {
  id?: string | number
  name: string
}

// ─── Normalized Subtask ──────────────────────────────────────────────────────
export interface NormalizedSubtask {
  id: string
  raw_id?: string | number
  title: string
  status: NormalizedTaskStatus
  progress: number
  process: number
  checked: boolean
  assignee?: ResolvedAssignee
  start_date: string | null
  due_date: string | null
  ea_id?: string | number
  task_id?: string | number
}

// ─── Normalized Task (từ mọi nguồn) ─────────────────────────────────────────
export interface NormalizedTask {
  id: string | number
  raw_id?: string | number
  title: string
  project_id?: string | number
  project_name: string
  department_id?: string | number
  department_name: string
  checklist_title: string
  assignee?: ResolvedAssignee
  assignees: ResolvedAssignee[]
  start_date: string | null
  due_date: string | null
  progress: number
  status: NormalizedTaskStatus
  priority: TaskPriority
  source: DataSource
  _table?: SupabaseTable
  employee_assignments?: RawEmployeeAssignment[]
  subtasks: NormalizedSubtask[]
  task_type: TaskType
  created_at?: string
}

// ─── Normalized Project ──────────────────────────────────────────────────────
export interface NormalizedProject {
  id: string | number
  name: string
  code?: string
  description?: string
  status: string
  start_date: string | null
  end_date: string | null
  department_name?: string
  department_id?: string | number
  progress_percentage: number
  _from_apec?: boolean
  organization_id?: string
  departments?: { id: string | number; name: string }
}

// ─── Normalized Incident ─────────────────────────────────────────────────────
export interface NormalizedIncident {
  id: string
  title: string
  status: NormalizedIncidentStatus
  created_at: string
  projects?: { name: string }
  _from_apec?: boolean
  checklist_item_id?: string
  [key: string]: unknown
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  overdueProjects: number
  planningProjects: number
  totalIncidents: number
  unresolvedIncidents: number
  totalStaff: number
  totalImprovements: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  todoTasks: number
  avgProgress: number
}

// ─── Dashboard Data (trả về từ useDashboardData hook) ────────────────────────
export interface DashboardData {
  stats: DashboardStats
  projects: NormalizedProject[]
  tasks: WidgetTask[]
  incidents: NormalizedIncident[]
  activities: RawActivity[]
  departments: RawDepartment[]
  overviewTasks: NormalizedTask[]
}

// ─── Widget Task (shape nhẹ cho MiniKanban, ScheduleWidget) ──────────────────
export interface WidgetTask {
  id: string | number
  title: string
  status: NormalizedTaskStatus
  priority: TaskPriority
  due_date: string | null
  project_id?: string | number
  projects: { name: string }
  assignee?: ResolvedAssignee
}

// ─── Lookup Maps (used by assignee & department resolver) ────────────────────
export interface LookupMaps {
  profilesMap: Map<string, { id: string; full_name: string; avatar_url?: string }>
  staffMap: Map<string, RawStaff>
  apecEmpMap: Map<string, RawApecEmployee>
  employeeDeptMap: Map<string, DepartmentInfo>
  projectMap: Map<string, NormalizedProject>
}

// ─── Raw types (từ API / Supabase, chưa normalize) ──────────────────────────
export interface RawEmployeeAssignment {
  id: string | number
  checked?: boolean
  process?: number
  progress?: number
  completed_date?: string
  date_start?: string
  start_date?: string
  date_end?: string
  end_date?: string
  due_date?: string
  employee?: RawApecEmployee
  subtasks?: RawApecSubtask[]
  [key: string]: unknown
}

export interface RawApecEmployee {
  id: string | number
  fullname?: string
  name?: string
  avatar?: string
  department_name?: string
  department_id?: string | number
  department?: string | { id?: string | number; name?: string }
  [key: string]: unknown
}

export interface RawApecSubtask {
  id?: string | number
  name?: string
  title?: string
  process?: number
  progress?: number
  checked?: boolean
  status?: string | number | { id?: number; name?: string }
  employee?: RawApecEmployee
  date_start?: string
  start_date?: string
  date_end?: string
  end_date?: string
  due_date?: string
  completed_date?: string
  [key: string]: unknown
}

export interface RawStaff {
  id: string | number
  full_name: string
  email?: string
  phone?: string
  role?: string
  department_id?: string | number
  avatar_url?: string
  departments?: { id: string | number; name: string } | Array<{ id: string | number; name: string }>
  [key: string]: unknown
}

export interface RawDepartment {
  id: string | number
  name: string
  description?: string | null
  organization_id?: string
  _from_apec?: boolean
  [key: string]: unknown
}

export interface RawActivity {
  id: string
  project_id?: string
  action?: string
  created_at: string
  projects?: { name: string }
  user?: { full_name?: string; avatar_url?: string }
  [key: string]: unknown
}
