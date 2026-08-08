import { supabase } from '@/lib/supabase/client'
import * as xlsx from 'xlsx'

export async function exportOrganizationData(orgId: string | null = null, filename: string = 'backup_data') {
  try {
    const filters = orgId ? { organization_id: orgId } : {}
    
    // 1. Fetch Organizations
    let orgQuery = supabase.from('organizations').select('*')
    if (orgId) orgQuery = orgQuery.eq('id', orgId)
    const { data: orgs } = await orgQuery

    // 2. Fetch Projects
    let projQuery = supabase.from('projects').select('*')
    if (orgId) projQuery = projQuery.eq('organization_id', orgId)
    const { data: projects } = await projQuery

    // 3. Fetch Tasks (Checklist Items)
    let tasksQuery = supabase.from('checklist_items').select(`
      *,
      project_checklists!inner(project_id, projects!inner(organization_id))
    `)
    if (orgId) tasksQuery = tasksQuery.eq('project_checklists.projects.organization_id', orgId)
    const { data: tasks } = await tasksQuery
    
    // Flatten tasks for excel
    const flatTasks = tasks?.map(t => ({
      ...t,
      project_id: t.project_checklists?.project_id,
      organization_id: t.project_checklists?.projects?.organization_id,
      project_checklists: undefined
    }))

    // 4. Fetch Incidents
    let incQuery = supabase.from('incidents').select('*')
    if (orgId) incQuery = incQuery.eq('organization_id', orgId)
    const { data: incidents } = await incQuery

    // 5. Fetch Improvements
    let impQuery = supabase.from('improvements').select('*')
    if (orgId) impQuery = impQuery.eq('organization_id', orgId)
    const { data: improvements } = await impQuery

    // 6. Fetch Staff (Organization Members)
    let staffQuery = supabase.from('organization_members').select(`
      *,
      profiles(full_name, phone)
    `)
    if (orgId) staffQuery = staffQuery.eq('organization_id', orgId)
    const { data: staff } = await staffQuery
    
    const flatStaff = staff?.map(s => ({
      ...s,
      full_name: s.profiles?.full_name,
      phone: s.profiles?.phone,
      profiles: undefined
    }))

    // Create workbook
    const wb = xlsx.utils.book_new()
    
    // Add sheets
    if (orgs && orgs.length > 0) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(orgs), 'Organizations')
    }
    if (flatStaff && flatStaff.length > 0) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(flatStaff), 'Staff')
    }
    if (projects && projects.length > 0) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(projects), 'Projects')
    }
    if (flatTasks && flatTasks.length > 0) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(flatTasks), 'Tasks')
    }
    if (incidents && incidents.length > 0) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(incidents), 'Incidents')
    }
    if (improvements && improvements.length > 0) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(improvements), 'Improvements')
    }

    // Export file
    const dateStr = new Date().toISOString().split('T')[0]
    xlsx.writeFile(wb, `${filename}_${dateStr}.xlsx`)
    
    return { success: true }
  } catch (err: any) {
    console.error('Export error:', err)
    return { success: false, error: err.message }
  }
}
