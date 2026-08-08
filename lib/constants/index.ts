export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  TEAM_LEAD: 'team_lead',
  MEMBER: 'member',
  GUEST: 'guest',
} as const

export const USER_ROLE_LABELS = {
  owner: 'Chủ sở hữu',
  manager: 'Quản lý',
  team_lead: 'Trưởng nhóm',
  member: 'Thành viên',
  guest: 'Khách',
} as const

export const PROJECT_STATUSES = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const

export const PROJECT_STATUS_LABELS = {
  planning: 'Lên kế hoạch',
  active: 'Đang chạy',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
} as const

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  BLOCKED: 'blocked',
} as const

export const TASK_STATUS_LABELS = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  in_review: 'Chờ duyệt',
  done: 'Hoàn thành',
  blocked: 'Bị chặn',
} as const

export const TASK_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export const TASK_PRIORITY_LABELS = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
} as const

export const PERMISSIONS = {
  MANAGE_ORGANIZATION: 'manage_organization',
  MANAGE_DEPARTMENTS: 'manage_departments',
  MANAGE_TEAMS: 'manage_teams',
  MANAGE_MEMBERS: 'manage_members',
  VIEW_MEMBERS: 'view_members',
  CREATE_PROJECT: 'create_project',
  EDIT_PROJECT: 'edit_project',
  DELETE_PROJECT: 'delete_project',
  MANAGE_PROJECT_MEMBERS: 'manage_project_members',
  CREATE_TASK: 'create_task',
  EDIT_TASK: 'edit_task',
  DELETE_TASK: 'delete_task',
  ASSIGN_TASK: 'assign_task',
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
} as const

// Role-based permission matrix
export const ROLE_PERMISSIONS = {
  owner: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.MANAGE_TEAMS,
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.MANAGE_PROJECT_MEMBERS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.ASSIGN_TASK,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA,
  ],
  team_lead: [
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.ASSIGN_TASK,
    PERMISSIONS.VIEW_REPORTS,
  ],
  member: [
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.VIEW_REPORTS,
  ],
  guest: [PERMISSIONS.VIEW_MEMBERS, PERMISSIONS.VIEW_REPORTS],
} as const

export const DEFAULT_COLORS = {
  primary: '#2563EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  neutral: '#6B7280',
} as const

// Status colors for UI
export const STATUS_COLORS = {
  planning: '#F59E0B',
  active: '#10B981',
  completed: '#8B5CF6',
  archived: '#6B7280',
} as const

export const TASK_STATUS_COLORS = {
  todo: '#6B7280',
  in_progress: '#3B82F6',
  in_review: '#F59E0B',
  done: '#10B981',
  blocked: '#EF4444',
} as const

export const PRIORITY_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
} as const
