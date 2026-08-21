/**
 * ============================================================================
 * INCIDENT NORMALIZER
 * ============================================================================
 * Normalize + merge incidents từ Supabase và APEC Global API.
 * Xử lý mapping status giữa 2 hệ thống.
 */

import type { NormalizedIncident } from './types'
import { resolveIncidentStatus } from './status-resolver'

// ─── Merge Incidents ────────────────────────────────────────────────────────

/**
 * Kết hợp incidents từ Supabase với APEC tasks có type là "SỰ CỐ & RỦI RO".
 * - Update status của Supabase incidents nếu tìm thấy matching APEC task
 * - Thêm APEC incident tasks chưa có trong Supabase
 */
export function mergeIncidents(
  supabaseIncidents: Record<string, unknown>[],
  apecTasksRaw: Record<string, unknown>[],
): NormalizedIncident[] {
  // Filter APEC tasks that are incidents
  const apecIncidentTasks = apecTasksRaw.filter((t: any) => {
    const typeName = String(t.type?.name || t.type_name || '').toUpperCase()
    return typeName.includes('SỰ CỐ') || typeName.includes('RỦI RO')
  })

  // Track existing incident IDs
  const existingIds = new Set([
    ...supabaseIncidents.map((i: any) => String(i.id)),
    ...supabaseIncidents.map((i: any) => String(i.checklist_item_id || '')).filter(Boolean),
  ])

  // Update Supabase incidents with APEC status
  const updatedSupabaseIncidents: NormalizedIncident[] = supabaseIncidents.map((inc: any) => {
    let currentStatus = inc.status

    // Find matching APEC task
    const apecTask = apecTasksRaw.find((t: any) =>
      String(t.id) === String(inc.checklist_item_id || inc.id) ||
      `apec_${t.id}` === String(inc.checklist_item_id) ||
      (t.name && inc.title && t.name.trim().toLowerCase() === inc.title.trim().toLowerCase())
    ) as any

    if (apecTask) {
      currentStatus = resolveIncidentStatus({
        status: apecTask.status,
        process: Number(apecTask.process ?? apecTask.progress ?? 0),
        is_completed: apecTask.is_completed,
      })
    }

    return {
      ...inc,
      id: String(inc.id),
      title: inc.title || '',
      status: currentStatus,
      created_at: inc.created_at || new Date().toISOString(),
    } as NormalizedIncident
  })

  // Add APEC-only incidents
  const extraApecIncidents: NormalizedIncident[] = apecIncidentTasks
    .filter((t: any) => !existingIds.has(String(t.id)))
    .map((t: any) => ({
      id: String(t.id),
      title: t.name || t.title || '',
      status: resolveIncidentStatus({
        status: t.status,
        process: Number(t.process ?? t.progress ?? 0),
        is_completed: t.is_completed,
      }),
      created_at: t.created_at || new Date().toISOString(),
      _from_apec: true,
    }))

  return [...updatedSupabaseIncidents, ...extraApecIncidents]
}

// ─── Compute Incident Stats ────────────────────────────────────────────────

export function computeIncidentStats(incidents: NormalizedIncident[]) {
  const total = incidents.length
  const unresolved = incidents.filter(inc =>
    inc.status !== 'resolved' && inc.status !== 'closed'
  ).length

  return { totalIncidents: total, unresolvedIncidents: unresolved }
}
