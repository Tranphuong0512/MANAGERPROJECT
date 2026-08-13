import { supabase } from '@/lib/supabase/client'
import ExcelJS from 'exceljs'
import { getVietnamDateString } from '@/lib/utils'

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
    const workbook = new ExcelJS.Workbook()
    
    // Helper function to add a sheet
    const addSheet = (data: any[], sheetName: string) => {
      if (data && data.length > 0) {
        const sheet = workbook.addWorksheet(sheetName)
        const columns = Object.keys(data[0]).map(key => ({
          header: key,
          key: key,
          width: 20
        }))
        sheet.columns = columns
        data.forEach(row => {
          sheet.addRow(row)
        })
      }
    }

    // Add sheets
    addSheet(orgs || [], 'Organizations')
    addSheet(flatStaff || [], 'Staff')
    addSheet(projects || [], 'Projects')
    addSheet(flatTasks || [], 'Tasks')
    addSheet(incidents || [], 'Incidents')
    addSheet(improvements || [], 'Improvements')

    // Export file for browser download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    
    const dateStr = getVietnamDateString()
    anchor.download = `${filename}_${dateStr}.xlsx`
    anchor.click()
    
    window.URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (err: any) {
    console.error('Export error:', err)
    return { success: false, error: err.message }
  }
}
