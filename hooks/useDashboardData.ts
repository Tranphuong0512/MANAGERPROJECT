'use client'

/**
 * ============================================================================
 * useDashboardData — Phase 2: Data Hook
 * ============================================================================
 * Replaces ~1000 lines of inline data fetching & processing in dashboard/page.tsx.
 * Uses SWR for caching + stale-while-revalidate.
 *
 * Returns typed `DashboardData` instead of 14 separate `any[]` states.
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'

import type {
  DashboardData,
  DashboardStats,
  NormalizedTask,
  NormalizedProject,
  NormalizedIncident,
  RawDepartment,
  RawActivity,
  WidgetTask,
} from '@/lib/domain/types'

import { buildLookupMaps, countUniqueStaff } from '@/lib/domain/assignee-resolver'
import { normalizeSupabaseTasks, normalizeChecklistItems, normalizeApecTasks, mergeAndDeduplicateTasks, toWidgetTasks } from '@/lib/domain/task-normalizer'
import { mergeDepartments, mergeProjects, computeProjectStats } from '@/lib/domain/project-normalizer'
import { mergeIncidents, computeIncidentStats } from '@/lib/domain/incident-normalizer'

// ─── Return Type ────────────────────────────────────────────────────────────

interface UseDashboardDataReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDashboardData(): UseDashboardDataReturn {
  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()

  const orgId = activeOrganization?.id
  const swrKey = orgId ? `dashboard-${orgId}` : null

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    // Don't fetch until org is loaded
    isLoadingOrg ? null : swrKey,
    () => fetchDashboardData(orgId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30s dedup
      errorRetryCount: 2,
    }
  )

  return {
    data: data ?? null,
    isLoading: isLoadingOrg || isLoading,
    error: !orgId && !isLoadingOrg
      ? 'Chưa có tổ chức nào được chọn. Hãy tạo hoặc tham gia một tổ chức để bắt đầu.'
      : (error ? String(error) : null),
    refresh: () => mutate(),
  }
}

// ─── Core Fetcher ───────────────────────────────────────────────────────────

async function fetchDashboardData(orgId: string): Promise<DashboardData> {
  // 🚀 Fast-path: Thử fetch qua Server-side Aggregation API route trước (1 network call + server cache)
  try {
    const res = await fetch(`/api/v1/dashboard/aggregate?orgId=${encodeURIComponent(orgId)}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.success && json.data) {
        return json.data as DashboardData
      }
    }
  } catch (err) {
    console.warn('Dashboard aggregate API failed, falling back to direct client fetching:', err)
  }

  // 🛡️ Fallback: Direct client-side fetching nếu API route gặp sự cố
  const orgIds = [orgId]

  // ── 1. Fetch all independent data sources in parallel ──
  const [
    projectsRes,
    apecProjectsRes,
    incidentsRes,
    staffCountRes,
    improvementsCountRes,
    departmentsRes,
    apecDepartmentsRes,
    staffRes,
    profilesRes,
    liveEmpRes,
    apecTasksRes,
  ] = await Promise.all([
    // Supabase projects
    supabase
      .from('projects')
      .select('*, departments(id, name)')
      .in('organization_id', orgIds)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),

    // APEC projects
    fetchJson('/api/v1/apec-global/projects'),

    // Supabase incidents
    supabase
      .from('incidents')
      .select('*, projects(name)')
      .or(`organization_id.in.(${orgIds.join(',')}),organization_id.is.null`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    // Staff count
    supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds)
      .is('deleted_at', null),

    // Improvements count
    supabase
      .from('improvements')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds),

    // Departments
    supabase
      .from('departments')
      .select('*')
      .in('organization_id', orgIds)
      .is('deleted_at', null)
      .order('name'),

    // APEC departments
    fetchJson('/api/v1/apec-global/departments'),

    // Staff
    supabase
      .from('staff')
      .select('id, full_name, email, phone, role, department_id, departments(id, name)')
      .in('organization_id', orgIds)
      .is('deleted_at', null),

    // Profiles
    supabase
      .from('organization_members')
      .select('user_id, profiles(id, full_name, avatar_url)')
      .in('organization_id', orgIds)
      .is('deleted_at', null),

    // APEC employees
    fetchJson('/api/v1/apec-global/employees'),

    // APEC tasks
    fetchJson('/api/v1/apec-global/tasks?limit=2000'),
  ])

  // ── 2. Merge departments ──
  const departments: RawDepartment[] = mergeDepartments(
    departmentsRes.data || [],
    apecDepartmentsRes.success ? (apecDepartmentsRes.items || []) : [],
  )

  // ── 3. Merge projects ──
  const rawSupabaseProjects = projectsRes.data || []
  const projects: NormalizedProject[] = mergeProjects(
    rawSupabaseProjects,
    apecProjectsRes.success ? (apecProjectsRes.items || []) : [],
  )

  // ── 4. Build lookup maps ──
  const maps = buildLookupMaps({
    profiles: profilesRes.data || [],
    staff: staffRes.data || [],
    apecEmployees: liveEmpRes.success ? (liveEmpRes.items || []) : [],
    projects,
  })

  // ── 5. Fetch Supabase tasks & checklist items (depends on project IDs) ──
  const supabaseProjectIds = rawSupabaseProjects.map((p: any) => p.id).filter(Boolean)

  let tasksQuery
  let checklistQuery
  let activitiesQuery

  if (supabaseProjectIds.length > 0) {
    tasksQuery = supabase
      .from('tasks')
      .select(`
        id, title, description, status, priority, progress_percentage, start_date, due_date, created_at, project_id, assigned_to, parent_task_id,
        projects(id, name, department_id, departments(id, name)),
        assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .in('project_id', supabaseProjectIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    checklistQuery = supabase
      .from('checklist_items')
      .select(`
        id, title, description, status, is_completed, progress, end_date, start_date, due_date, priority, created_at,
        checklist_id, assigned_staff_id, assignee_ids,
        project_checklists(id, title, name, project_id, deleted_at, projects(id, name, department_id, departments(id, name))),
        assignee:staff(id, full_name, avatar_url, department_id, departments(id, name))
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    activitiesQuery = supabase
      .from('project_activities')
      .select('*, projects(name), user:profiles!project_activities_user_id_fkey(full_name, avatar_url)')
      .in('project_id', supabaseProjectIds)
      .order('created_at', { ascending: false })
      .limit(10)
  } else {
    tasksQuery = supabase
      .from('tasks')
      .select(`
        id, title, description, status, priority, progress_percentage, start_date, due_date, created_at, project_id, assigned_to, parent_task_id,
        projects(id, name, department_id, departments(id, name))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1000)

    checklistQuery = supabase
      .from('checklist_items')
      .select(`
        id, title, description, status, is_completed, progress, end_date, start_date, due_date, priority, created_at,
        checklist_id, assigned_staff_id, assignee_ids,
        project_checklists(id, title, name, project_id, deleted_at, projects(id, name, department_id, departments(id, name))),
        assignee:staff(id, full_name, avatar_url, department_id, departments(id, name))
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1000)

    activitiesQuery = null
  }

  const [tasksRes, checklistRes, activitiesRes] = await Promise.all([
    tasksQuery,
    checklistQuery,
    activitiesQuery || Promise.resolve({ data: [] }),
  ])

  // ── 6. Normalize tasks from all sources ──
  const supabaseTasks: NormalizedTask[] = normalizeSupabaseTasks(tasksRes.data || [], maps)
  const checklistTasks: NormalizedTask[] = normalizeChecklistItems(checklistRes.data || [], maps)

  const apecTasksRaw = apecTasksRes.success ? (apecTasksRes.items || []) : []
  const apecTasks: NormalizedTask[] = normalizeApecTasks(apecTasksRaw, maps)

  // ── 7. Merge & deduplicate ──
  const overviewTasks = mergeAndDeduplicateTasks(supabaseTasks, checklistTasks, apecTasks)
  const widgetTasks: WidgetTask[] = toWidgetTasks(overviewTasks)

  // ── 8. Merge incidents ──
  const incidents: NormalizedIncident[] = mergeIncidents(
    incidentsRes.data || [],
    apecTasksRaw,
  )

  // ── 9. Compute stats ──
  const projectStats = computeProjectStats(projects)
  const incidentStats = computeIncidentStats(incidents)
  const totalStaff = countUniqueStaff(
    staffRes.data || [],
    liveEmpRes.success ? (liveEmpRes.items || []) : [],
    staffCountRes.count || 0,
  )

  const completedTasks = overviewTasks.filter(t => t.status === 'done' || t.progress >= 100).length
  const inProgressTasks = overviewTasks.filter(t => t.status === 'in_progress' || t.status === 'review').length
  const todoTasks = overviewTasks.filter(t => t.status === 'todo' || t.status === 'blocked').length

  const stats: DashboardStats = {
    ...projectStats,
    ...incidentStats,
    totalStaff,
    totalImprovements: improvementsCountRes.count || 0,
    totalTasks: overviewTasks.length,
    completedTasks,
    inProgressTasks,
    todoTasks,
    avgProgress: projectStats.avgProgress || (
      overviewTasks.length > 0 ? Math.round((completedTasks / overviewTasks.length) * 100) : 0
    ),
  }

  return {
    stats,
    projects,
    tasks: widgetTasks,
    incidents,
    activities: (activitiesRes.data || []) as RawActivity[],
    departments,
    overviewTasks,
  }
}

// ─── Helper: Safe JSON fetch ────────────────────────────────────────────────

async function fetchJson(url: string): Promise<{ success: boolean; items: any[] }> {
  try {
    const r = await fetch(url)
    return await r.json()
  } catch {
    return { success: false, items: [] }
  }
}
