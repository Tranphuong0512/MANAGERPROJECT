/**
 * ============================================================================
 * ASSIGNEE RESOLVER — Single Source of Truth
 * ============================================================================
 * Tập trung TOÀN BỘ logic phân giải người thực hiện & phòng ban:
 * - Từ Supabase assigned_user / assigned_to
 * - Từ Supabase checklist_items (assignee / assigned_staff_id / assignee_ids)
 * - Từ APEC Global employee_assignments
 * - Từ APEC Global employee trực tiếp
 *
 * Cũng chịu trách nhiệm build các LookupMaps từ raw data.
 */

import type {
  ResolvedAssignee,
  DepartmentInfo,
  LookupMaps,
  NormalizedProject,
  RawStaff,
  RawApecEmployee,
  RawEmployeeAssignment,
} from './types'

// Helper: PostgREST may return departments as object or array
function getDeptInfo(depts: RawStaff['departments']): { name: string; id?: string | number } | undefined {
  if (!depts) return undefined
  if (Array.isArray(depts)) return depts[0]
  return depts
}

// ─── Build Lookup Maps ──────────────────────────────────────────────────────

interface BuildLookupMapsInput {
  profiles: Array<{ user_id?: string; profiles?: { id: string; full_name: string; avatar_url?: string } | Array<{ id: string; full_name: string; avatar_url?: string }> }>
  staff: RawStaff[]
  apecEmployees: RawApecEmployee[]
  projects: NormalizedProject[]
}

export function buildLookupMaps(input: BuildLookupMapsInput): LookupMaps {
  const { profiles, staff, apecEmployees, projects } = input

  // Profiles map
  const profilesMap = new Map<string, { id: string; full_name: string; avatar_url?: string }>()
  profiles.forEach(m => {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (prof?.id) {
      profilesMap.set(String(prof.id), prof)
      if (prof.full_name) profilesMap.set(prof.full_name.trim().toLowerCase(), prof)
    }
  })

  // Staff map
  const staffMap = new Map<string, RawStaff>()
  staff.forEach(st => {
    if (st.id) staffMap.set(String(st.id), st)
    if (st.full_name) staffMap.set(st.full_name.trim().toLowerCase(), st)
  })

  // APEC employee map (multiple key variations for flexible lookup)
  const apecEmpMap = new Map<string, RawApecEmployee>()
  apecEmployees.forEach(e => {
    if (e.id) {
      apecEmpMap.set(String(e.id), e)
      apecEmpMap.set(`apec_${e.id}`, e)
      apecEmpMap.set(`apec_emp_${e.id}`, e)
    }
    if (e.fullname) apecEmpMap.set(e.fullname.trim().toLowerCase(), e)
    if (e.name) apecEmpMap.set(e.name.trim().toLowerCase(), e)
  })

  // Employee → Department map
  const employeeDeptMap = new Map<string, DepartmentInfo>()

  staff.forEach(st => {
    const dept = getDeptInfo(st.departments)
    if (dept?.name) {
      if (st.id) employeeDeptMap.set(String(st.id), { name: dept.name, id: st.department_id })
      if (st.full_name) employeeDeptMap.set(st.full_name.trim().toLowerCase(), { name: dept.name, id: st.department_id })
    }
  })

  apecEmployees.forEach(e => {
    const dName = typeof e.department === 'object' && e.department?.name
      ? e.department.name
      : (typeof e.department === 'string' && e.department.trim()
        ? e.department
        : (e.department_name || null))
    const dId = typeof e.department === 'object' ? e.department?.id : e.department_id

    if (dName) {
      if (e.id) {
        const info: DepartmentInfo = { name: dName, id: dId ? String(dId) : undefined }
        employeeDeptMap.set(String(e.id), info)
        employeeDeptMap.set(`apec_${e.id}`, info)
        employeeDeptMap.set(`apec_emp_${e.id}`, info)
      }
      if (e.fullname) employeeDeptMap.set(e.fullname.trim().toLowerCase(), { name: dName, id: dId ? String(dId) : undefined })
      if (e.name) employeeDeptMap.set(e.name.trim().toLowerCase(), { name: dName, id: dId ? String(dId) : undefined })
    }
  })

  // Project map (multiple key variations)
  const projectMap = new Map<string, NormalizedProject>()
  projects.forEach(p => {
    projectMap.set(String(p.id), p)
    if (p.code) projectMap.set(p.code.toLowerCase(), p)
    if (p.name) projectMap.set(p.name.trim().toLowerCase(), p)
  })

  return { profilesMap, staffMap, apecEmpMap, employeeDeptMap, projectMap }
}

// ─── Resolve Single Assignee from Supabase data ─────────────────────────────

interface ResolveSupabaseAssigneeOptions {
  assigned_user?: { id: string; full_name: string; avatar_url?: string } | null
  assigned_to?: string | null
  maps: LookupMaps
}

export function resolveSupabaseAssignee(opts: ResolveSupabaseAssigneeOptions): ResolvedAssignee | undefined {
  const { assigned_user, assigned_to, maps } = opts

  if (assigned_user) {
    return {
      id: assigned_user.id,
      full_name: assigned_user.full_name,
      avatar_url: assigned_user.avatar_url,
    }
  }

  if (assigned_to) {
    const key = String(assigned_to)
    const prof = maps.profilesMap.get(key)
    if (prof) return { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url }

    const st = maps.staffMap.get(key)
    if (st) return { id: st.id, full_name: st.full_name, avatar_url: st.avatar_url }

    const apecEmp = maps.apecEmpMap.get(key)
    if (apecEmp) return { id: apecEmp.id, full_name: apecEmp.fullname || apecEmp.name || '', avatar_url: apecEmp.avatar }
  }

  return undefined
}

// ─── Resolve Multiple Assignees from checklist_items ────────────────────────

interface ResolveChecklistAssigneesOptions {
  assignee?: RawStaff | null
  assigned_staff_id?: string | null
  assignee_ids?: (string | number)[]
  maps: LookupMaps
}

export function resolveChecklistAssignees(opts: ResolveChecklistAssigneesOptions): ResolvedAssignee[] {
  const { assignee, assigned_staff_id, assignee_ids, maps } = opts
  const result: ResolvedAssignee[] = []
  const seen = new Set<string>()

  // 1. Direct assignee from join
  if (assignee) {
    result.push({
      id: assignee.id,
      full_name: assignee.full_name,
      avatar_url: assignee.avatar_url,
      department_name: getDeptInfo(assignee.departments)?.name,
      department_id: assignee.department_id,
    })
    seen.add(String(assignee.id))
  }

  // 2. assigned_staff_id
  if (assigned_staff_id && !seen.has(String(assigned_staff_id))) {
    const resolved = lookupPerson(String(assigned_staff_id), maps)
    if (resolved) {
      result.push(resolved)
      seen.add(String(assigned_staff_id))
    }
  }

  // 3. assignee_ids array
  if (Array.isArray(assignee_ids)) {
    assignee_ids.forEach(aId => {
      const strId = String(aId)
      if (!seen.has(strId)) {
        const resolved = lookupPerson(strId, maps)
        if (resolved) {
          result.push(resolved)
          seen.add(strId)
        }
      }
    })
  }

  return result
}

// ─── Resolve APEC Employee Assignments → Assignees ──────────────────────────

export function resolveApecAssignees(
  employeeAssignments: RawEmployeeAssignment[],
  fallbackEmployee: RawApecEmployee | undefined,
  maps: LookupMaps,
): ResolvedAssignee[] {
  const result: ResolvedAssignee[] = []
  const seen = new Set<string>()

  // From employee_assignments
  employeeAssignments.forEach(assign => {
    const emp = assign.employee
    if (emp) {
      const empId = String(emp.id || '')
      if (empId && !seen.has(empId)) {
        seen.add(empId)
        const resolved = resolveApecEmployeeToAssignee(emp, maps)
        if (resolved) {
          result.push({ ...resolved, ea_id: assign.id })
        }
      }
    }
  })

  // Fallback to direct employee
  if (result.length === 0 && fallbackEmployee) {
    const resolved = resolveApecEmployeeToAssignee(fallbackEmployee, maps)
    if (resolved) {
      result.push(resolved)
    }
  }

  return result
}

// ─── Resolve Department for a Task ──────────────────────────────────────────

interface ResolveDepartmentOptions {
  primaryAssignee?: ResolvedAssignee
  directDepartment?: string | { name?: string; id?: string | number } | null
  directDepartmentName?: string | null
  directDepartmentId?: string | number | null
  project?: NormalizedProject | null
  maps: LookupMaps
}

export function resolveDepartment(opts: ResolveDepartmentOptions): DepartmentInfo {
  const { primaryAssignee, directDepartment, directDepartmentName, directDepartmentId, project, maps } = opts

  // 1. From assignee's department (pre-resolved on assignee)
  if (primaryAssignee?.department_name) {
    return { name: primaryAssignee.department_name, id: primaryAssignee.department_id }
  }

  // 2. From assignee lookup in employeeDeptMap
  if (primaryAssignee?.id) {
    const found = maps.employeeDeptMap.get(String(primaryAssignee.id))
    if (found) return found
  }
  if (primaryAssignee?.full_name) {
    const found = maps.employeeDeptMap.get(primaryAssignee.full_name.trim().toLowerCase())
    if (found) return found
  }

  // 3. From task's direct department field
  if (directDepartment && typeof directDepartment === 'object' && directDepartment.name) {
    return { name: directDepartment.name, id: directDepartment.id }
  }
  if (directDepartmentName) {
    return { name: directDepartmentName, id: directDepartmentId ?? undefined }
  }

  // 4. From project's department
  if (project) {
    const dName = project.departments?.name || project.department_name
    const dId = project.department_id || project.departments?.id
    if (dName) return { name: dName, id: dId }
  }

  // 5. Fallback
  return { name: 'Chung / Chưa phân loại' }
}

// ─── Count Unique Staff ─────────────────────────────────────────────────────

export function countUniqueStaff(
  staff: RawStaff[],
  apecEmployees: RawApecEmployee[],
  staffCount: number,
): number {
  const uniqueSet = new Set<string>()

  apecEmployees.forEach(e => {
    const key = (e.fullname || e.name || '').trim().toLowerCase() || String(e.id || '')
    if (key) uniqueSet.add(key)
  })

  staff.forEach(st => {
    const key = (st.full_name || '').trim().toLowerCase() || String(st.id || '')
    if (key) uniqueSet.add(key)
  })

  return uniqueSet.size > 0
    ? uniqueSet.size
    : Math.max(apecEmployees.length, staff.length, staffCount)
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function lookupPerson(key: string, maps: LookupMaps): ResolvedAssignee | undefined {
  const st = maps.staffMap.get(key)
  if (st) {
    return {
      id: st.id,
      full_name: st.full_name,
      avatar_url: st.avatar_url,
      department_name: getDeptInfo(st.departments)?.name,
      department_id: st.department_id,
    }
  }

  const prof = maps.profilesMap.get(key)
  if (prof) {
    return { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url }
  }

  const apecEmp = maps.apecEmpMap.get(key)
  if (apecEmp) {
    return {
      id: apecEmp.id,
      full_name: apecEmp.fullname || apecEmp.name || '',
      avatar_url: apecEmp.avatar,
    }
  }

  return undefined
}

function resolveApecEmployeeToAssignee(
  emp: RawApecEmployee,
  maps: LookupMaps,
): ResolvedAssignee | undefined {
  const empId = String(emp.id || '')
  const empName = emp.fullname || emp.name || ''
  if (!empId && !empName) return undefined

  let deptName = emp.department_name
    || (typeof emp.department === 'object' ? emp.department?.name : undefined)
    || (typeof emp.department === 'string' ? emp.department : undefined)
    || ''
  let deptId = emp.department_id || (typeof emp.department === 'object' ? emp.department?.id : undefined)

  if (!deptName && empId) {
    const found = maps.employeeDeptMap.get(empId) || maps.employeeDeptMap.get(empName.trim().toLowerCase())
    if (found) {
      deptName = found.name
      deptId = found.id
    }
  }

  return {
    id: emp.id,
    full_name: empName,
    avatar_url: emp.avatar,
    department_name: deptName || undefined,
    department_id: deptId,
  }
}
