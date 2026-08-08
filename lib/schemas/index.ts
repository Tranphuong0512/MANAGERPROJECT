import { z } from 'zod'

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(1000).optional(),
})

export const updateOrganizationSchema = createOrganizationSchema.partial()

// Department schemas
export const createDepartmentSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Department name is required').max(255),
  description: z.string().max(1000).optional(),
})

export const updateDepartmentSchema = createDepartmentSchema.omit({ organization_id: true }).partial()

// Team schemas
export const createTeamSchema = z.object({
  department_id: z.string().uuid('Invalid department ID'),
  organization_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Team name is required').max(255),
  description: z.string().max(1000).optional(),
})

export const updateTeamSchema = createTeamSchema.omit({ department_id: true, organization_id: true }).partial()

// Project schemas
export const createProjectSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['planning', 'active', 'completed', 'archived']).default('planning'),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  client: z.string().max(255).optional(),
  department: z.string().max(255).optional(),
})

export const updateProjectSchema = createProjectSchema.omit({ organization_id: true }).partial()

// Task schemas
export const createTaskSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  parent_task_id: z.string().uuid('Invalid parent task ID').optional(),
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).default('todo'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  start_date: z.string().date().optional(),
  due_date: z.string().date().optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  estimated_hours: z.number().positive().optional(),
  actual_hours: z.number().positive().optional(),
})

export const updateTaskSchema = createTaskSchema.omit({ project_id: true }).partial()

// User role schemas
export const updateUserRoleSchema = z.object({
  role_id: z.string().uuid('Invalid role ID'),
})

// Invitation schema
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role_id: z.string().uuid('Invalid role ID'),
  team_id: z.string().uuid('Invalid team ID').optional(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
