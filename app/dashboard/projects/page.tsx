'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ProjectsHeader } from '@/components/projects/ProjectsHeader'
import { ProjectsStats } from '@/components/projects/ProjectsStats'
import { ProjectsTable } from '@/components/projects/ProjectsTable'
import { ProjectsBoard } from '@/components/projects/ProjectsBoard'
import { ProjectsGantt } from '@/components/projects/ProjectsGantt'
import { ProjectsBottomWidgets } from '@/components/projects/ProjectsBottomWidgets'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { EditProjectDialog } from '@/components/projects/advanced/EditProjectDialog'
import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useOrganization } from '@/components/providers/organization-provider'
import { usePermissions } from '@/hooks/usePermissions'
import { ProjectsListPrintTemplate } from '@/components/projects/ProjectsListPrintTemplate'
import { customAlert, customConfirm } from '@/utils/alert'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<any>(null)
  
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'gantt'>('list')
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [stats, setStats] = useState<any>({})
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const printTemplateRef = useRef<HTMLDivElement>(null)
  const [isPreparingReport, setIsPreparingReport] = useState(false)

  const triggerPrint = useReactToPrint({
    contentRef: printTemplateRef,
    documentTitle: 'BaoCao_DanhSachDuAn',
    onAfterPrint: () => setIsPreparingReport(false)
  })

  const handlePrint = async () => {
    setIsPreparingReport(true)
    setTimeout(() => {
      triggerPrint()
    }, 500)
  }

  const handleExportExcel = async () => {
    try {
      setIsPreparingReport(true)
      const wb = new ExcelJS.Workbook()
      wb.creator = 'NIX.AI'
      wb.created = new Date()
      
      const ws = wb.addWorksheet('Danh sách Dự án')
      
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } } as ExcelJS.FillPattern,
        alignment: { vertical: 'middle', horizontal: 'center' } as Partial<ExcelJS.Alignment>,
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        } as Partial<ExcelJS.Borders>
      }

      const cellStyle = {
        font: { name: 'Arial', size: 10 },
        alignment: { vertical: 'middle', wrapText: true } as Partial<ExcelJS.Alignment>,
        border: {
          top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
        } as Partial<ExcelJS.Borders>
      }

      ws.columns = [
        { header: 'STT', width: 8 },
        { header: 'Tên dự án', width: 45 },
        { header: 'Mã dự án', width: 15 },
        { header: 'Trạng thái', width: 20 },
        { header: 'Khách hàng', width: 25 },
        { header: 'Tiến độ (%)', width: 15 },
        { header: 'Ngân sách', width: 25 },
        { header: 'Bắt đầu', width: 15 },
        { header: 'Kết thúc', width: 15 }
      ]
      
      ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

      projects.forEach((p, i) => {
        const progress = p.progress_percentage || 0
        let status = 'Chưa bắt đầu'
        if (p.status === 'active' || p.status === 'in_progress') status = 'Đang triển khai'
        else if (p.status === 'completed' || p.status === 'done') status = 'Hoàn thành'
        else if (p.status === 'overdue') status = 'Trễ hạn'
        
        const row = ws.addRow([
          i + 1,
          p.name,
          p.code || `PRJ-${p.id.substring(0, 6)}`,
          status,
          p.client || 'Nội bộ',
          progress,
          p.budget || 0,
          p.start_date ? new Date(p.start_date).toLocaleDateString('vi-VN') : '',
          p.end_date ? new Date(p.end_date).toLocaleDateString('vi-VN') : ''
        ])
        
        row.eachCell(cell => Object.assign(cell, cellStyle))
        
        const statusCell = row.getCell(4)
        if (status === 'Đang triển khai') statusCell.font = { ...cellStyle.font, color: { argb: 'FF2563EB' }, bold: true }
        if (status === 'Hoàn thành') statusCell.font = { ...cellStyle.font, color: { argb: 'FF059669' }, bold: true }
        if (status === 'Trễ hạn') statusCell.font = { ...cellStyle.font, color: { argb: 'FFE11D48' }, bold: true }
        
        // Format budget
        const budgetCell = row.getCell(7)
        budgetCell.numFmt = '#,##0" ₫"'
        
        // Format progress
        const progressCell = row.getCell(6)
        progressCell.alignment = { horizontal: 'center' }
      })

      const buffer = await wb.xlsx.writeBuffer()
      saveAs(new Blob([buffer]), 'BaoCao_DanhSachDuAn.xlsx')
    } catch (err) {
      console.error(err)
      await customAlert('Lỗi khi xuất file Excel')
    } finally {
      setIsPreparingReport(false)
    }
  }

  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (isLoadingOrg) return

    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }
        if (activeOrganization) {
          setSelectedOrg(activeOrganization.id)
          await loadProjectsAndStats(activeOrganization.id)
        } else {
          setProjects([])
          setStats({})
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, activeOrganization, isLoadingOrg])

  const loadProjectsAndStats = async (orgId: string) => {
    try {
      const projectsPromise = supabase
        .from('projects')
        .select('*, project_members (user_id, profiles(full_name)), project_checklists (checklist_items (status, is_completed)), incidents (count), improvements (count), staff!projects_manager_id_fkey(full_name)')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
        
      const incidentsPromise = supabase
        .from('incidents')
        .select('status, projects!inner(deleted_at)')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .is('projects.deleted_at', null);

      const [projectsResult, incidentsResult, apecProjectsRes, allDbProjectsRes] = await Promise.all([
        projectsPromise,
        incidentsPromise,
        fetch('/api/v1/apec-global/projects').then(r => r.json()).catch(() => ({ success: false, items: [] })),
        supabase.from('projects').select('id, code, name')
      ]);

      if (projectsResult.error) throw projectsResult.error

      let rawProjectsData = [...(projectsResult.data || [])];
      const allDbProjects = allDbProjectsRes.data || [];

      // Helper: normalize APEC status (object/number/string) -> standard string
      const normalizeApecStatus = (st: any): string => {
        if (!st) return 'active';
        if (typeof st === 'object' && st.name) {
          const n = String(st.name).toLowerCase();
          if (n.includes('hoàn thành') || n.includes('done') || n.includes('completed')) return 'completed';
          if (n.includes('tạm dừng') || n.includes('paused')) return 'paused';
          if (n.includes('quá hạn') || n.includes('overdue')) return 'overdue';
          if (n.includes('chưa') || n.includes('planning') || n.includes('not_started')) return 'planning';
          return 'active';
        }
        if (typeof st === 'object' && st.id) {
          const id = Number(st.id);
          if (id === 4) return 'completed';
          if (id === 3) return 'paused';
          if (id === 1) return 'planning';
          return 'active';
        }
        if (typeof st === 'number') {
          if (st === 4) return 'completed';
          if (st === 3) return 'paused';
          if (st === 1) return 'planning';
          return 'active';
        }
        const s = String(st).toLowerCase();
        if (s === 'done' || s === 'completed') return 'completed';
        if (s === 'paused' || s === 'on_hold') return 'paused';
        if (s === 'overdue') return 'overdue';
        if (s === 'planning' || s === 'not_started') return 'planning';
        if (s === 'active' || s === 'in_progress') return 'active';
        return s || 'active';
      };

      // Merge Real-time projects from APEC GLOBAL Database
      if (apecProjectsRes.success && apecProjectsRes.items) {
        const liveProjects = apecProjectsRes.items || [];
        liveProjects.forEach((apecPrj: any) => {
          const code = apecPrj.code || `P-${apecPrj.id}`;
          const existingIdx = rawProjectsData.findIndex((p: any) => 
            p.code?.toLowerCase() === code.toLowerCase() ||
            String(p.id) === String(apecPrj.id) ||
            p.name?.toLowerCase().trim() === (apecPrj.name || '').toLowerCase().trim()
          );

          if (existingIdx >= 0) {
            rawProjectsData[existingIdx] = {
              ...rawProjectsData[existingIdx],
              name: apecPrj.name || apecPrj.project_name || apecPrj.title || rawProjectsData[existingIdx].name,
              code,
              description: apecPrj.description || rawProjectsData[existingIdx].description,
              // Always prefer Supabase status (user-controlled) over APEC API status
              status: rawProjectsData[existingIdx].status || normalizeApecStatus(apecPrj.status),
              manager: rawProjectsData[existingIdx].manager || apecPrj.manager || apecPrj.manager_name || apecPrj.leader || apecPrj.pm_name || null,
              manager_id: rawProjectsData[existingIdx].manager_id || apecPrj.manager_id || null,
              department: rawProjectsData[existingIdx].department || apecPrj.department || apecPrj.department_name || null,
              client: rawProjectsData[existingIdx].client || apecPrj.client || apecPrj.customer || null,
              budget: rawProjectsData[existingIdx].budget || Number(apecPrj.budget) || 0,
              start_date: apecPrj.start_date || rawProjectsData[existingIdx].start_date,
              end_date: apecPrj.end_date || rawProjectsData[existingIdx].end_date,
              isRealtimeApec: true
            };
          } else {
            // Tìm UUID thật trong database Supabase của bất kỳ tổ chức nào
            const dbMatch = allDbProjects.find((p: any) =>
              p.code?.toLowerCase() === code.toLowerCase() ||
              p.name?.toLowerCase().trim() === (apecPrj.name || '').toLowerCase().trim()
            );

            const realId = dbMatch?.id || `apec_prj_${apecPrj.id}`;

            // KHÔNG tự động ghi nhận vào Supabase — dữ liệu 100% từ Apec Global

            rawProjectsData.push({
              id: realId,
              name: apecPrj.name || apecPrj.project_name || apecPrj.title || `Dự án APEC ${apecPrj.id}`,
              code,
              description: apecPrj.description || `Mã APEC: ${code}`,
              status: normalizeApecStatus(apecPrj.status),
              manager: apecPrj.manager || apecPrj.manager_name || apecPrj.leader || apecPrj.pm_name || null,
              manager_id: apecPrj.manager_id || null,
              department: apecPrj.department || apecPrj.department_name || null,
              client: apecPrj.client || apecPrj.customer || null,
              budget: Number(apecPrj.budget) || 0,
              progress_percentage: Number(apecPrj.progress) || 0,
              start_date: apecPrj.start_date || new Date().toISOString(),
              end_date: apecPrj.end_date || null,
              project_checklists: [],
              incidents: [],
              improvements: [],
              isRealtimeApec: true
            });
          }
        });
      }

      // Calculate progress for each project based on checklists
      const projectsData = rawProjectsData.map((p: any) => {
        let totalTasks = 0
        let doneTasks = 0
        const checklists = p.project_checklists || []
        checklists.forEach((list: any) => {
          const items = list.checklist_items || []
          totalTasks += items.length
          doneTasks += items.filter((i: any) => i.status === 'done' || i.is_completed).length
        })
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (p.progress_percentage || 0)
        return {
          ...p,
          progress_percentage: progress
        }
      })

      setProjects(projectsData)

      // Calculate stats
      const total = projectsData?.length || 0
      const active = projectsData?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0
      const completed = projectsData?.filter(p => p.status === 'completed' || p.status === 'done').length || 0
      const overdue = projectsData?.filter(p => p.status === 'overdue').length || 0
      
      const computedTotalBudget = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0

      let totalIncidents = 0
      let unresolvedIncidents = 0
      
      const orgIncidents = incidentsResult.data;
      if (orgIncidents) {
        totalIncidents = orgIncidents.length
        unresolvedIncidents = orgIncidents.filter(i => i.status !== 'fixed' && i.status !== 'closed' && i.status !== 'resolved').length
      }

      setStats({
        totalProjects: total,
        activeProjects: active,
        completedProjects: completed,
        overdueProjects: overdue,
        totalBudget: computedTotalBudget,
        totalIncidents,
        unresolvedIncidents
      })

    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    let matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    if (statusFilter === 'active') {
      matchesStatus = p.status === 'active' || p.status === 'in_progress';
    } else if (statusFilter === 'completed') {
      matchesStatus = p.status === 'completed' || p.status === 'done';
    } else if (statusFilter === 'archived') {
      matchesStatus = p.status === 'archived' || p.status === 'cancelled';
    }
    return matchesSearch && matchesStatus;
  });

  const handleDeleteProject = async (project: any) => {
    if (!(await customConfirm(`Bạn có chắc chắn muốn xóa dự án "${project.name}" không? Thao tác này không thể hoàn tác.`))) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      loadProjectsAndStats(selectedOrg);
    } catch (err) {
      console.error(err);
      await customAlert('Lỗi khi xóa dự án');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải dự án...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <ProjectsHeader 
        onCreateClick={() => setShowCreateDialog(true)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onExportExcel={handleExportExcel}
        onExportPDF={handlePrint}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        canCreate={hasPermission('create_projects')}
        canExport={hasPermission('export_projects')}
        isPreparingReport={isPreparingReport}
      />
      
      <div className="print:hidden">
        <ProjectsStats stats={stats} />
      
        {viewMode === 'list' && (
          <ProjectsTable 
            projects={filteredProjects} 
            onProjectClick={(p) => router.push(`/dashboard/projects/${p.id}`)}
            onEditClick={(p) => setProjectToEdit(p)}
            onDeleteClick={handleDeleteProject}
            onStatusChange={async (project, newStatus) => {
              // Optimistic update
              setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newStatus } : p))
              // Extract numeric ID for APEC API from code (e.g. "P-62" -> 62)
              const codeNum = project.code ? project.code.replace(/^P-/i, '') : '';
              const apecId = codeNum && /^\d+$/.test(codeNum) ? Number(codeNum) : project.id;
              // Sync to APEC GLOBAL
              try {
                await fetch('/api/v1/apec-global/projects', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: apecId, status: newStatus }),
                });
              } catch (e) {
                console.warn('Lỗi đồng bộ Apec Global khi chuyển trạng thái dự án:', e);
              }
              // Sync to Supabase
              const isUuidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id);
              if (isUuidId) {
                await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
              }
              // Don't reload immediately - let optimistic update stand
              // The next natural load will pick up the persisted status
            }}
            canView={hasPermission('view_projects')}
            canEdit={hasPermission('edit_projects')}
            canDelete={hasPermission('delete_projects')}
          />
        )}
        {viewMode === 'board' && (
          <ProjectsBoard 
            projects={filteredProjects}
            onStatusChange={async (id, status) => {
              // Optimistic update
              setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
              // Find project to extract code
              const proj = projects.find(p => p.id === id);
              const codeNum = proj?.code ? proj.code.replace(/^P-/i, '') : '';
              const apecId = codeNum && /^\d+$/.test(codeNum) ? Number(codeNum) : id;
              // API update
              try {
                await fetch('/api/v1/apec-global/projects', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: apecId, status }),
                });
              } catch (e) {
                console.warn('Lỗi đồng bộ Apec Global khi chuyển trạng thái dự án:', e);
              }
              const isUuidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
              if (isUuidId) {
                await supabase.from('projects').update({ status }).eq('id', id);
              }
            }}
          />
        )}
        {viewMode === 'gantt' && (
          <ProjectsGantt projects={projects} />
        )}

        <ProjectsBottomWidgets />
      </div>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={selectedOrg}
        onProjectCreated={() => loadProjectsAndStats(selectedOrg)}
      />

      <EditProjectDialog
        isOpen={!!projectToEdit}
        onClose={() => setProjectToEdit(null)}
        project={projectToEdit}
        organizationId={selectedOrg}
        onUpdated={(updatedProj) => {
          loadProjectsAndStats(selectedOrg)
          setProjectToEdit(null)
        }}
      />
      
      <div className="hidden">
        <ProjectsListPrintTemplate 
          ref={printTemplateRef} 
          organization={activeOrganization} 
          stats={stats} 
          projects={filteredProjects} 
        />
      </div>
    </div>
  )
}
