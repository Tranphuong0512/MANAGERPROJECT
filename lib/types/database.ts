export type ProjectStatus = 'planning' | 'active' | 'completed' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type UserRoleEnum = 'owner' | 'manager' | 'team_lead' | 'member' | 'guest'

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Department {
  id: string
  organization_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Team {
  id: string
  department_id: string
  organization_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  name: UserRoleEnum
  description?: string
  created_at: string
}

export interface Permission {
  id: string
  name: string
  description?: string
  category: string
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role_id: string
  team_id?: string
  joined_at: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  description?: string
  status: ProjectStatus
  start_date?: string
  end_date?: string
  progress_percentage: number
  version: number
  change_count: number
  created_at: string
  updated_at: string
  created_by?: string
  deleted_at?: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_id: string
  joined_at: string
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  parent_task_id?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to?: string
  start_date?: string
  due_date?: string
  progress_percentage: number
  estimated_hours?: number
  actual_hours?: number
  version: number
  change_count: number
  created_at: string
  updated_at: string
  created_by?: string
  deleted_at?: string
}

export interface TaskHistory {
  id: string
  task_id: string
  action: string
  field_name?: string
  old_value?: string
  new_value?: string
  changed_by?: string
  created_at: string
}

export interface ProjectHistory {
  id: string
  project_id: string
  action: string
  field_name?: string
  old_value?: string
  new_value?: string
  changed_by?: string
  version: number
  created_at: string
}

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
  created_at: string
}

export interface CurrentUser extends User {
  profile?: Profile
  organization?: Organization
  role?: UserRole
}

export interface ApiKey {
  id: string
  organization_id: string
  name: string
  key_hash: string
  created_by?: string
  created_at: string
  expires_at?: string
  is_active: boolean
}

export interface Webhook {
  id: string
  organization_id: string
  url: string
  events: string[]
  secret?: string
  created_by?: string
  created_at: string
  is_active: boolean
}
