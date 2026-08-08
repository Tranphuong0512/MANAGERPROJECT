import { supabase } from '@/lib/supabase/client'
import type {
  Organization,
  Project,
  Task,
  Department,
  Team,
  OrganizationMember,
  ProjectMember,
  Profile,
} from '@/lib/types/database'

// Organizations
export async function getOrganization(id: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data as Organization
}

export async function createOrganization(data: any) {
  const { data: org, error } = await supabase
    .from('organizations')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return org as Organization
}

export async function updateOrganization(id: string, data: any) {
  const { data: org, error } = await supabase
    .from('organizations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return org as Organization
}

export async function deleteOrganization(id: string) {
  const { error } = await supabase
    .from('organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Departments
export async function getDepartmentsByOrg(orgId: string) {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('name')

  if (error) throw error
  return data as Department[]
}

export async function createDepartment(data: any) {
  const { data: dept, error } = await supabase
    .from('departments')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return dept as Department
}

export async function updateDepartment(id: string, data: any) {
  const { data: dept, error } = await supabase
    .from('departments')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return dept as Department
}

// Teams
export async function getTeamsByDepartment(deptId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('department_id', deptId)
    .is('deleted_at', null)
    .order('name')

  if (error) throw error
  return data as Team[]
}

export async function createTeam(data: any) {
  const { data: team, error } = await supabase
    .from('teams')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return team as Team
}

// Organization Members
export async function getOrgMembers(orgId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      user_roles (name),
      profiles (full_name, avatar_url)
    `)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('joined_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

export async function addOrgMember(data: any) {
  const { data: member, error } = await supabase
    .from('organization_members')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return member as OrganizationMember
}

export async function updateOrgMemberRole(memberId: string, roleId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .update({ role_id: roleId, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data as OrganizationMember
}

export async function removeOrgMember(memberId: string) {
  const { error } = await supabase
    .from('organization_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) throw error
}

// Projects
export async function getProjectsByOrg(orgId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (count),
      tasks (count)
    `)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (
        user_id,
        role_id,
        user_roles (name)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data as any
}

export async function createProject(data: any) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return project as Project
}

export async function updateProject(id: string, data: any) {
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
      version: (data.version || 0) + 1,
      change_count: (data.change_count || 0) + 1,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return project as Project
}

export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Tasks
export async function getProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_user:profiles (full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .eq('parent_task_id', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

export async function getTask(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_user:profiles (full_name, avatar_url),
      subtasks:tasks (count),
      history:task_history (count)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data as any
}

export async function getTaskSubtasks(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_task_id', taskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Task[]
}

export async function createTask(data: any) {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert([data])
    .select()
    .single()

  if (error) throw error

  // Record in history
  await supabase.from('task_history').insert([
    {
      task_id: task.id,
      action: 'created',
      changed_by: data.created_by,
    },
  ])

  return task as Task
}

export async function updateTask(id: string, data: any) {
  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
      version: (data.version || 0) + 1,
      change_count: (data.change_count || 0) + 1,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task as Task
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Task History
export async function getTaskHistory(taskId: string) {
  const { data, error } = await supabase
    .from('task_history')
    .select(`
      *,
      user:profiles (full_name, avatar_url)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

// Project History
export async function getProjectHistory(projectId: string) {
  const { data, error } = await supabase
    .from('project_history')
    .select(`
      *,
      user:profiles (full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

// Roles and Permissions
export async function getRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getPermissions() {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })

  if (error) throw error
  return data
}
