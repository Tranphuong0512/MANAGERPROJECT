/**
 * ============================================================================
 * STATUS RESOLVER — Single Source of Truth
 * ============================================================================
 * Tập trung TOÀN BỘ logic phân giải status từ mọi nguồn:
 * - Supabase tasks (string status)
 * - Supabase checklist_items (string/object/number status + is_completed)
 * - APEC Global tasks (object status + employee_assignments checked + process)
 * - APEC outbound sync (numeric status IDs 1-4)
 * - Incidents (string status)
 *
 * KHÔNG BAO GIỜ duplicate logic này ở nơi khác. Import từ module này.
 */

import type { NormalizedTaskStatus, NormalizedIncidentStatus, RawEmployeeAssignment } from './types'

// ─── Vietnamese / English keyword sets ───────────────────────────────────────

const DONE_KEYWORDS = [
  'hoàn thành', 'đã duyệt', 'da duyet', 'đã phê duyệt',
  'done', 'completed', 'resolved', 'implemented', 'closed', 'finished', 'đóng',
] as const

const REVIEW_KEYWORDS = [
  'chờ duyệt', 'chờ', 'đợi', 'pending',
  'review', 'in_review', 'pending_review', 'pending_approval', 'waiting_approval',
] as const

const IN_PROGRESS_KEYWORDS = [
  'đang', 'in_progress', 'doing', 'progress',
  'investigating', 'fixing', 'evaluating', 'active',
] as const

const TODO_KEYWORDS = [
  'chưa', 'todo', 'not_started', 'new', 'mới',
  'planning', 'planned', 'kế hoạch',
  'on_hold', 'hold', 'paused',
  'cancelled', 'canceled', 'rejected', 'proposed', 'open',
] as const

// ─── Helper: check if string includes any keyword ───────────────────────────

function includesAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

function equalsAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase().trim()
  return keywords.some(kw => lower === kw)
}

// ─── Extract status string/id from raw status (object | string | number) ────

interface ParsedRawStatus {
  statusId: number | null
  statusName: string
  rawValue: unknown
}

function parseRawStatus(raw: unknown, fallbackTaskStatus?: unknown): ParsedRawStatus {
  // Object with { id, name }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    return {
      statusId: obj.id != null ? Number(obj.id) : null,
      statusName: String(obj.name || '').toLowerCase().trim(),
      rawValue: raw,
    }
  }

  // Fallback to task_status field
  if (fallbackTaskStatus && typeof fallbackTaskStatus === 'object' && !Array.isArray(fallbackTaskStatus)) {
    const obj = fallbackTaskStatus as Record<string, unknown>
    return {
      statusId: obj.id != null ? Number(obj.id) : null,
      statusName: String(obj.name || '').toLowerCase().trim(),
      rawValue: fallbackTaskStatus,
    }
  }

  // String
  if (typeof raw === 'string') {
    return {
      statusId: null,
      statusName: raw.toLowerCase().trim(),
      rawValue: raw,
    }
  }

  // Number (APEC status IDs: 1=todo, 2=in_progress, 3=review, 4=done)
  if (typeof raw === 'number') {
    return {
      statusId: raw,
      statusName: '',
      rawValue: raw,
    }
  }

  return { statusId: null, statusName: '', rawValue: raw }
}

// ─── 1. Resolve Supabase Task Status ────────────────────────────────────────

interface ResolveSupabaseTaskStatusOptions {
  status: unknown
  is_completed?: boolean
  progress_percentage?: number | null
}

export function resolveSupabaseTaskStatus(opts: ResolveSupabaseTaskStatusOptions): NormalizedTaskStatus {
  const { status, is_completed, progress_percentage } = opts
  const strStatus = String(status || '').toLowerCase().trim()
  const progress = Number(progress_percentage ?? 0)

  // Done
  if (
    is_completed ||
    equalsAny(strStatus, ['done', 'completed', 'resolved']) ||
    includesAny(strStatus, DONE_KEYWORDS)
  ) {
    return 'done'
  }

  // Review (not done, but review status or 100% progress)
  if (
    equalsAny(strStatus, ['review', 'in_review', 'pending_approval']) ||
    includesAny(strStatus, REVIEW_KEYWORDS) ||
    progress >= 100
  ) {
    return 'review'
  }

  // Blocked
  if (strStatus === 'blocked') return 'blocked'

  // In progress
  if (
    equalsAny(strStatus, ['in_progress']) ||
    includesAny(strStatus, IN_PROGRESS_KEYWORDS)
  ) {
    return 'in_progress'
  }

  return 'todo'
}

// ─── 2. Resolve Checklist Item Status ───────────────────────────────────────

interface ResolveChecklistStatusOptions {
  status: unknown
  task_status?: unknown
  is_completed?: boolean
  progress?: number | null
}

export function resolveChecklistItemStatus(opts: ResolveChecklistStatusOptions): NormalizedTaskStatus {
  const { status, task_status, is_completed, progress } = opts
  const parsed = parseRawStatus(status, task_status)
  const progressVal = Number(progress ?? 0)

  // Done
  if (
    is_completed ||
    parsed.statusId === 4 ||
    equalsAny(parsed.statusName, ['done', 'completed', 'resolved']) ||
    includesAny(parsed.statusName, DONE_KEYWORDS)
  ) {
    return 'done'
  }

  // Review
  if (
    parsed.statusId === 3 ||
    equalsAny(parsed.statusName, ['review', 'in_review', 'pending_approval']) ||
    includesAny(parsed.statusName, REVIEW_KEYWORDS) ||
    progressVal >= 100
  ) {
    return 'review'
  }

  // In progress
  if (
    parsed.statusId === 2 ||
    equalsAny(parsed.statusName, ['in_progress']) ||
    includesAny(parsed.statusName, IN_PROGRESS_KEYWORDS)
  ) {
    return 'in_progress'
  }

  return 'todo'
}

// ─── 3. Resolve APEC Task Status ────────────────────────────────────────────

interface ResolveApecTaskStatusOptions {
  status: unknown
  task_status?: unknown
  is_completed?: boolean
  process?: number
  employee_assignments?: RawEmployeeAssignment[]
}

export function resolveApecTaskStatus(opts: ResolveApecTaskStatusOptions): NormalizedTaskStatus {
  const { status, task_status, is_completed, process = 0, employee_assignments = [] } = opts
  const ea = employee_assignments
  const isApprovedByBoss = ea.length > 0 && ea.every(a => a.checked === true)

  const parsed = parseRawStatus(status, task_status)
  const parentProcess = Number(process)

  // Calculate average EA progress
  let eaAvg = 0
  if (ea.length > 0) {
    const sum = ea.reduce((acc, cur) => acc + (Number(cur.process ?? cur.progress) || (cur.checked ? 100 : 0)), 0)
    eaAvg = Math.round(sum / ea.length)
  }

  // Done
  if (
    isApprovedByBoss ||
    is_completed ||
    parsed.statusId === 4 ||
    equalsAny(parsed.statusName, ['done', 'completed', 'resolved', 'implemented']) ||
    includesAny(parsed.statusName, DONE_KEYWORDS)
  ) {
    return 'done'
  }

  // Review
  if (
    parsed.statusId === 3 ||
    equalsAny(parsed.statusName, ['review', 'in_review', 'pending_approval']) ||
    includesAny(parsed.statusName, REVIEW_KEYWORDS) ||
    parentProcess >= 100
  ) {
    return 'review'
  }

  // In progress
  if (
    parentProcess > 0 ||
    eaAvg > 0 ||
    parsed.statusId === 2 ||
    includesAny(parsed.statusName, IN_PROGRESS_KEYWORDS)
  ) {
    return 'in_progress'
  }

  return 'todo'
}

// ─── 4. Resolve APEC Subtask Status ─────────────────────────────────────────

interface ResolveSubtaskStatusOptions {
  checked?: boolean
  status?: unknown
  process?: number
}

export function resolveSubtaskStatus(opts: ResolveSubtaskStatusOptions): NormalizedTaskStatus {
  const { checked, status, process = 0 } = opts
  const parsed = parseRawStatus(status)

  if (
    checked ||
    parsed.statusId === 4 ||
    parsed.statusName === 'done' ||
    includesAny(parsed.statusName, DONE_KEYWORDS)
  ) {
    return 'done'
  }

  if (process > 0 || parsed.statusId === 2) {
    return 'in_progress'
  }

  return 'todo'
}

// ─── 5. Resolve Incident Status ─────────────────────────────────────────────

interface ResolveIncidentStatusOptions {
  status?: unknown
  process?: number
  is_completed?: boolean
}

export function resolveIncidentStatus(opts: ResolveIncidentStatusOptions): NormalizedIncidentStatus {
  const { status, process = 0, is_completed } = opts
  const parsed = parseRawStatus(status)

  if (
    is_completed ||
    parsed.statusId === 4 ||
    process >= 100 ||
    equalsAny(parsed.statusName, ['done', 'resolved', 'closed', 'fixed']) ||
    includesAny(parsed.statusName, DONE_KEYWORDS)
  ) {
    return 'resolved'
  }

  if (
    parsed.statusId === 3 ||
    equalsAny(parsed.statusName, ['review']) ||
    includesAny(parsed.statusName, ['chờ duyệt'])
  ) {
    return 'review'
  }

  if (
    parsed.statusId === 2 ||
    equalsAny(parsed.statusName, ['in_progress', 'investigating']) ||
    includesAny(parsed.statusName, ['đang thực hiện'])
  ) {
    return 'investigating'
  }

  return 'new'
}

// ─── 6. Resolve Progress Value ──────────────────────────────────────────────

export function resolveProgress(opts: {
  progress?: number | null
  status: NormalizedTaskStatus
}): number {
  const { progress, status } = opts
  if (progress != null && !isNaN(Number(progress))) return Number(progress)
  if (status === 'done') return 100
  if (status === 'review') return 100
  if (status === 'in_progress') return 50
  return 0
}

// ─── 7. Resolve Status to Numeric ID (for APEC outbound sync) ──────────────

/**
 * Map status → numeric ID cho APEC Global API
 * 1 = Chưa thực hiện / Lên kế hoạch
 * 2 = Đang thực hiện
 * 3 = Chờ duyệt
 * 4 = Hoàn thành / Đã duyệt
 *
 * QUAN TRỌNG: Nhiệm vụ 100% progress từ nhân viên → status 3 (Chờ duyệt),
 * KHÔNG tự duyệt thành 4.
 */
export function resolveStatusToNumericId(st: unknown, fallbackProcess?: number): number {
  // Object with { id, name }
  if (st && typeof st === 'object' && !Array.isArray(st)) {
    const obj = st as Record<string, unknown>
    if (obj.id) return Number(obj.id)
    const name = String(obj.name || '').toLowerCase()
    if (includesAny(name, DONE_KEYWORDS)) return 4
    if (includesAny(name, REVIEW_KEYWORDS)) return 3
    if (includesAny(name, IN_PROGRESS_KEYWORDS)) return 2
    if (includesAny(name, TODO_KEYWORDS)) return 1
  }

  // String
  if (typeof st === 'string') {
    const s = st.toLowerCase()
    if (equalsAny(s, ['done', 'completed', 'resolved', 'implemented', 'closed', 'finished'])) return 4
    if (equalsAny(s, ['review', 'pending_review', 'pending_approval', 'waiting_approval', 'pending'])) return 3
    if (equalsAny(s, ['in_progress', 'doing', 'investigating', 'fixing', 'evaluating', 'active'])) return 2
    if (equalsAny(s, ['todo', 'not_started', 'new', 'planning', 'planned', 'on_hold', 'hold', 'paused', 'cancelled', 'canceled', 'rejected', 'proposed', 'open'])) return 1
  }

  // Numeric
  if (st != null && !Number.isNaN(Number(st)) && Number(st) > 0) return Number(st)

  // Fallback based on progress
  const p = fallbackProcess ?? 0
  return p >= 100 ? 3 : p > 0 ? 2 : 1
}
