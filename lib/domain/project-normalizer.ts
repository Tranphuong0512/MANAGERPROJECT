/**
 * ============================================================================
 * PROJECT NORMALIZER
 * ============================================================================
 * Normalize + merge dự án từ Supabase và APEC Global API.
 */

import type { NormalizedProject, RawDepartment } from './types'

// ─── Merge APEC Departments into Supabase Departments ───────────────────────

export function mergeDepartments(
  supabaseDepts: RawDepartment[],
  apecDepts: Array<{ id: string | number; name?: string; department_name?: string; description?: string }>,
): RawDepartment[] {
  const result = [...supabaseDepts]
  const existingNames = new Set(result.map(d => (d.name || '').trim().toLowerCase()))

  apecDepts.forEach(apecDept => {
    const dName = apecDept.name || apecDept.department_name
    if (dName && !existingNames.has(dName.trim().toLowerCase())) {
      existingNames.add(dName.trim().toLowerCase())
      result.push({
        id: apecDept.id || `apec_dept_${apecDept.id}`,
        name: dName.trim(),
        description: apecDept.description || null,
        _from_apec: true,
      })
    }
  })

  return result
}

// ─── Merge APEC Projects into Supabase Projects ────────────────────────────

export function mergeProjects(
  supabaseProjects: Record<string, unknown>[],
  apecProjects: Record<string, unknown>[],
): NormalizedProject[] {
  const result: NormalizedProject[] = supabaseProjects.map(p => normalizeSupabaseProject(p))

  apecProjects.forEach((apecPrj: any) => {
    const code = apecPrj.code || `P-${apecPrj.id}`
    const existingIdx = result.findIndex(p =>
      (p.code && p.code.toLowerCase() === code.toLowerCase()) ||
      String(p.id) === String(apecPrj.id) ||
      (p.name && p.name.trim().toLowerCase() === (apecPrj.name || '').trim().toLowerCase())
    )

    if (existingIdx >= 0) {
      // Update existing project with APEC data
      result[existingIdx] = {
        ...result[existingIdx],
        name: apecPrj.name || apecPrj.project_name || result[existingIdx].name,
        code,
        department_name: apecPrj.department_name || apecPrj.department?.name || result[existingIdx].department_name,
        department_id: apecPrj.department_id || apecPrj.department?.id || result[existingIdx].department_id,
      }
    } else {
      // Add new APEC project
      result.push({
        id: String(apecPrj.id),
        name: apecPrj.name || apecPrj.project_name || `Dự án APEC #${apecPrj.id}`,
        code,
        description: apecPrj.description || '',
        status: apecPrj.status || 'active',
        start_date: apecPrj.start_date || null,
        end_date: apecPrj.end_date || null,
        department_name: apecPrj.department_name || apecPrj.department?.name || undefined,
        department_id: apecPrj.department_id || apecPrj.department?.id || undefined,
        progress_percentage: Number(apecPrj.process || apecPrj.progress || 0),
        _from_apec: true,
      })
    }
  })

  return result
}

// ─── Compute Dashboard Project Stats ────────────────────────────────────────

export function computeProjectStats(projects: NormalizedProject[]) {
  const now = new Date()

  const activeProjects = projects.filter(p =>
    p.status === 'active' || p.status === 'in_progress'
  ).length

  const completedProjects = projects.filter(p =>
    p.status === 'completed' || p.status === 'done'
  ).length

  const planningProjects = projects.filter(p =>
    p.status === 'planning' || p.status === 'not_started'
  ).length

  const overdueProjects = projects.filter(p => {
    if (p.status === 'overdue') return true
    if (p.end_date && (p.status === 'active' || p.status === 'in_progress' || p.status === 'planning')) {
      return new Date(p.end_date) < now
    }
    return false
  }).length

  const projectsWithProgress = projects.filter(p => p.progress_percentage > 0)
  const avgProgress = projectsWithProgress.length > 0
    ? Math.round(projectsWithProgress.reduce((sum, p) => sum + p.progress_percentage, 0) / projectsWithProgress.length)
    : 0

  return {
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    planningProjects,
    overdueProjects,
    avgProgress,
  }
}

// ─── Internal ───────────────────────────────────────────────────────────────

function normalizeSupabaseProject(p: Record<string, unknown>): NormalizedProject {
  const raw = p as any
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    description: raw.description,
    status: raw.status || 'active',
    start_date: raw.start_date || null,
    end_date: raw.end_date || null,
    department_name: raw.departments?.name || raw.department_name,
    department_id: raw.department_id || raw.departments?.id,
    progress_percentage: Number(raw.progress_percentage || 0),
    organization_id: raw.organization_id,
    departments: raw.departments,
  }
}
