'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ChevronLeft, Download, Printer, MoreVertical, ChevronDown } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { ProjectTopStats } from '@/components/projects/advanced/ProjectTopStats'
import { ProjectLeftSidebar } from '@/components/projects/advanced/ProjectLeftSidebar'
import { ProjectChecklistTable } from '@/components/projects/advanced/ProjectChecklistTable'
import { ProjectRightSidebar } from '@/components/projects/advanced/ProjectRightSidebar'
import { ProjectBottomSection } from '@/components/projects/advanced/ProjectBottomSection'
import { ProjectPrintTemplate } from '@/components/projects/ProjectPrintTemplate'
import { PrintReportModal } from '@/components/projects/PrintReportModal'
import { useOrganization } from '@/components/providers/organization-provider'
import { customAlert, customConfirm } from '@/utils/alert'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { activeOrganization } = useOrganization()
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orgProjects, setOrgProjects] = useState<any[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [stats, setStats] = useState({
    progress: 0,
    checklistTotal: 0,
    checklistCompleted: 0,
    taskTotal: 0,
    taskCompleted: 0,
    taskTodo: 0,
    taskInProgress: 0,
    taskReview: 0,
    incidentsTotal: 18,
    incidentsFixed: 9,
    newBugs: 5,
    onTimeRate: 81
  })
  
  const componentRef = useRef<HTMLDivElement>(null)
  const printTemplateRef = useRef<HTMLDivElement>(null)
  const [fullData, setFullData] = useState<any>(null)
  const [isPreparingReport, setIsPreparingReport] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [reportSelections, setReportSelections] = useState<{
    selectedChecklistIds: (string | number)[]
    includeIncidents: boolean
    includeImprovements: boolean
    includeMembers: boolean
  }>({
    selectedChecklistIds: [],
    includeIncidents: true,
    includeImprovements: true,
    includeMembers: true
  })

  const fetchFullReportData = async () => {
    const isUuid = typeof project?.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id);

    if (!isUuid && project?.id) {
      try {
        const [taskTypesRes, tasksRes] = await Promise.all([
          fetch('/api/v1/apec-global/task-types'),
          fetch('/api/v1/apec-global/tasks?limit=1000')
        ]);
        const taskTypesData = await taskTypesRes.json().catch(() => ({ items: [] }));
        const tasksData = await tasksRes.json().catch(() => ({ items: [] }));

        const pIdStr = String(project.id);
        const pTasks = (tasksData.items || []).filter((t: any) => String(t.project?.id || t.project_id || 62) === pIdStr);

        const checklists = (taskTypesData.items || []).map((type: any) => ({
          title: type.name,
          checklist_items: pTasks
            .filter((t: any) => String(t.type?.id || t.type_id || '') === String(type.id))
            .map((t: any) => ({
              id: t.id,
              title: t.title || t.name,
              status: (t.task_status?.id === 4 || t.process === 100 || t.status === 'done' || t.status === 'completed') ? 'done' : ((t.task_status?.id === 3 || t.status === 'review') ? 'review' : ((t.task_status?.id === 2 || t.status === 'in_progress') ? 'in_progress' : 'todo')),
              assignees_names: t.assignee?.name || t.employee_assignments?.[0]?.employee?.name || '-',
              start_date: t.start_date,
              end_date: t.due_date || t.end_date
            }))
        })).filter((c: any) => c.checklist_items.length > 0);

        return {
          checklists,
          incidents: [],
          improvements: [],
          members: project?.manager_name ? [{ user_id: project.manager_id || 'mgr', role: 'manager', profiles: { full_name: project.manager_name } }] : []
        };
      } catch (err) {
        console.warn('APEC GLOBAL report fetch error:', err);
        return { checklists: [], incidents: [], improvements: [], members: [] };
      }
    }

    const [checklistsRes, incidentsRes, improvementsRes, membersRes, orgMembersRes] = await Promise.all([
      supabase.from('project_checklists').select('title, sort_order, checklist_items(assigned_staff_id, assignee_ids, title, is_completed, status, start_date, end_date, sort_order, profiles:assigned_staff_id(full_name))').eq('project_id', project.id).is('deleted_at', null).order('sort_order', { ascending: true }),
      supabase.from('incidents').select('title, severity, status, created_at').eq('project_id', project.id).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('improvements').select('title, status, reporter_id').eq('project_id', project.id),
      supabase.from('project_members').select('user_id, profiles(full_name)').eq('project_id', project.id),
      supabase.from('organization_members').select('user_id, profiles(full_name)').eq('organization_id', project.organization_id).is('deleted_at', null)
    ])
    
    if (checklistsRes.error) console.error('Checklist Fetch Error:', checklistsRes.error)
    if (incidentsRes.error) console.error('Incidents Fetch Error:', incidentsRes.error)
    if (improvementsRes.error) console.error('Improvements Fetch Error:', improvementsRes.error)
    if (membersRes.error) console.error('Members Fetch Error:', membersRes.error)

    const membersData = membersRes.data || [];
    const orgMembersData = orgMembersRes.data || [];
    const allMembers: any[] = [];
    
    // Add manager at the top
    if (project.manager_id && project.staff) {
      const managerName = Array.isArray(project.staff) ? project.staff[0]?.full_name : project.staff.full_name;
      allMembers.push({
        user_id: project.manager_id,
        role: 'manager',
        profiles: { full_name: managerName }
      });
    }

    // Add other members (excluding manager if they are in project_members)
    membersData.forEach((m: any) => {
      if (m.user_id !== project.manager_id && !allMembers.find(existing => existing.user_id === m.user_id)) {
        allMembers.push({
          ...m,
          role: 'member'
        });
      }
    });

    // Auto-detect any staff assigned to checklists but not in project_members
    if (checklistsRes.data) {
      checklistsRes.data.forEach((list: any) => {
        if (list.checklist_items) {
          list.checklist_items.forEach((item: any) => {
            if (item.assignee_ids && item.assignee_ids.length > 0) {
              (item as any).assignees_names = item.assignee_ids.map((id: string) => {
                const orgM = orgMembersData.find(m => m.user_id === id);
                return orgM ? (Array.isArray((orgM as any).profiles) ? (orgM as any).profiles[0]?.full_name : (orgM as any).profiles?.full_name) : 'Unknown';
              }).join(', ');
            } else if (item.assigned_staff_id && item.profiles) {
              (item as any).assignees_names = Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles.full_name;
              if (!allMembers.find(m => m.user_id === item.assigned_staff_id)) {
                allMembers.push({
                  user_id: item.assigned_staff_id,
                  role: 'member',
                  profiles: item.profiles
                });
              }
            } else {
              item.assignees_names = '-';
            }
          });
        }
      });
    }

    const improvementsData = improvementsRes.data || [];
    
    improvementsData.forEach((imp: any) => {
      const member = allMembers.find((m: any) => m.user_id === imp.reporter_id);
      if (member) {
        imp.profiles = member.profiles;
      }
    });

    return {
      checklists: checklistsRes.data || [],
      incidents: incidentsRes.data || [],
      improvements: improvementsData,
      members: allMembers
    }
  }

  const triggerPrint = useReactToPrint({
    contentRef: printTemplateRef,
    documentTitle: `BaoCao_${project?.name || 'ChiTiet'}`,
    onAfterPrint: () => setIsPreparingReport(false)
  })

  const openReportModal = async () => {
    setIsPreparingReport(true)
    try {
      const data = await fetchFullReportData()
      setFullData(data)
      setShowPrintModal(true)
    } catch (err) {
      console.error('Lỗi chuẩn bị dữ liệu báo cáo:', err)
    } finally {
      setIsPreparingReport(false)
    }
  }

  const handleConfirmPrint = (
    selectedChecklistIds: (string | number)[],
    includeIncidents: boolean,
    includeImprovements: boolean,
    includeMembers: boolean
  ) => {
    setReportSelections({
      selectedChecklistIds,
      includeIncidents,
      includeImprovements,
      includeMembers
    })
    setIsPreparingReport(true)
    setTimeout(() => {
      try {
        if (typeof triggerPrint === 'function') {
          triggerPrint()
        } else {
          window.print()
        }
      } catch (err) {
        console.warn('ReactToPrint trigger failed, executing window.print():', err)
        window.print()
      } finally {
        setIsPreparingReport(false)
      }
    }, 500)
  }

  const handleConfirmExcel = (
    selectedChecklistIds: (string | number)[],
    includeIncidents: boolean,
    includeImprovements: boolean,
    includeMembers: boolean
  ) => {
    setReportSelections({
      selectedChecklistIds,
      includeIncidents,
      includeImprovements,
      includeMembers
    })
    executeExportExcel(selectedChecklistIds, includeIncidents, includeImprovements, includeMembers)
  }

  const executeExportExcel = async (
    selectedChecklistIds: (string | number)[],
    includeIncidents: boolean,
    includeImprovements: boolean,
    includeMembers: boolean
  ) => {
    try {
      setIsPreparingReport(true)
      const data = fullData || (await fetchFullReportData())
      if (!data) return

      const wb = new ExcelJS.Workbook()
      wb.creator = 'NIX.AI'
      wb.created = new Date()

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

      // 1. TỔNG QUAN & NHÂN SỰ
      if (includeMembers) {
        const ws1 = wb.addWorksheet('Nhân Sự')
        ws1.columns = [
          { header: 'STT', width: 8 },
          { header: 'Họ tên nhân sự', width: 35 },
          { header: 'Vai trò', width: 20 }
        ]
        ws1.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

        data.members.forEach((m: any, i: number) => {
          const row = ws1.addRow([
            i + 1,
            (Array.isArray(m.profiles) ? m.profiles[0]?.full_name : m.profiles?.full_name) || m.staff?.full_name || 'Không rõ',
            m.role === 'manager' ? 'Quản lý dự án' : 'Thành viên'
          ])
          row.eachCell(cell => Object.assign(cell, cellStyle))
        })
      }

      // 2. CÔNG VIỆC (Filtered by selectedChecklistIds)
      const ws2 = wb.addWorksheet('Công Việc')
      ws2.columns = [
        { header: 'STT', width: 8 },
        { header: 'Tên công việc', width: 50 },
        { header: 'Trạng thái', width: 20 },
        { header: 'Người phụ trách', width: 25 },
        { header: 'Ngày bắt đầu', width: 15 },
        { header: 'Hạn chót', width: 15 }
      ]
      ws2.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

      const targetChecklists = data.checklists.filter((c: any) =>
        selectedChecklistIds.length === 0 || selectedChecklistIds.includes(c.id) || selectedChecklistIds.map(String).includes(String(c.id))
      )

      let taskRowIdx = 2
      for (const list of targetChecklists) {
        const groupRow = ws2.addRow([`📂 ${list.title}`])
        groupRow.font = { bold: true, color: { argb: 'FF0F172A' }, size: 11 }
        groupRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        ws2.mergeCells(`A${taskRowIdx}:F${taskRowIdx}`)
        taskRowIdx++

        if (list.checklist_items) {
          const items = [...list.checklist_items]
          for (let idx = 0; idx < items.length; idx++) {
            const item: any = items[idx]
            let status = 'Chưa làm'
            const st = String(item.status || '').toLowerCase()
            if (st === 'done' || st === 'completed' || item.is_completed) status = 'Hoàn thành'
            else if (st === 'in_progress' || st.includes('đang')) status = 'Đang làm'
            else if (st === 'review' || st.includes('chờ') || st.includes('duyệt')) status = 'Chờ duyệt'

            const row = ws2.addRow([
              idx + 1,
              item.title,
              status,
              item.assignees_names || (Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name) || item.staff?.full_name || '-',
              item.start_date ? new Date(item.start_date).toLocaleDateString('vi-VN') : '',
              item.end_date ? new Date(item.end_date).toLocaleDateString('vi-VN') : ''
            ])
            row.eachCell(cell => Object.assign(cell, cellStyle))

            const statusCell = row.getCell(3)
            if (status === 'Hoàn thành') statusCell.font = { ...cellStyle.font, color: { argb: 'FF059669' }, bold: true }
            if (status === 'Đang làm') statusCell.font = { ...cellStyle.font, color: { argb: 'FF2563EB' }, bold: true }
            if (status === 'Chờ duyệt') statusCell.font = { ...cellStyle.font, color: { argb: 'FFD97706' }, bold: true }

            taskRowIdx++
          }
        }
      }

      // 3. SỰ CỐ
      if (includeIncidents && data.incidents && data.incidents.length > 0) {
        const ws3 = wb.addWorksheet('Sự Cố')
        ws3.columns = [
          { header: 'STT', width: 8 },
          { header: 'Tên sự cố', width: 50 },
          { header: 'Mức độ', width: 15 },
          { header: 'Trạng thái', width: 20 },
          { header: 'Ngày báo', width: 15 }
        ]
        ws3.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

        data.incidents.forEach((inc: any, i: number) => {
          let severity = 'Thấp'
          if (inc.severity === 'critical') severity = 'Nghiêm trọng'
          else if (inc.severity === 'high') severity = 'Cao'
          else if (inc.severity === 'medium') severity = 'Trung bình'

          let status = 'Đã đóng'
          if (inc.status === 'new') status = 'Mới'
          else if (inc.status === 'investigating') status = 'Đang điều tra'
          else if (inc.status === 'fixing') status = 'Đang sửa'
          else if (inc.status === 'resolved') status = 'Đã xử lý'

          const row = ws3.addRow([
            i + 1, inc.title, severity, status,
            inc.created_at ? new Date(inc.created_at).toLocaleDateString('vi-VN') : ''
          ])
          row.eachCell(cell => Object.assign(cell, cellStyle))
        })
      }

      // 4. CẢI TIẾN
      if (includeImprovements && data.improvements && data.improvements.length > 0) {
        const ws4 = wb.addWorksheet('Cải Tiến')
        ws4.columns = [
          { header: 'STT', width: 8 },
          { header: 'Nội dung sáng kiến', width: 50 },
          { header: 'Trạng thái', width: 20 },
          { header: 'Người đề xuất', width: 25 }
        ]
        ws4.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

        const impStatusMap: Record<string, string> = {
          'new': 'Mới',
          'evaluating': 'Đang đánh giá',
          'approved': 'Đã duyệt',
          'implemented': 'Đã áp dụng'
        }

        data.improvements.forEach((imp: any, i: number) => {
          const status = impStatusMap[imp.status] || 'Từ chối'
          const row = ws4.addRow([
            i + 1,
            imp.title,
            status,
            (Array.isArray(imp.profiles) ? imp.profiles[0]?.full_name : imp.profiles?.full_name) || imp.reporter?.full_name || 'Không rõ'
          ])
          row.eachCell(cell => Object.assign(cell, cellStyle))
        })
      }

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `BaoCao_${project.name}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`)
    } catch (err) {
      console.error('Export Excel error:', err)
    } finally {
      setIsPreparingReport(false)
    }
  }

  useEffect(() => {
    const loadProject = async () => {
      try {
        const { data: dbProj } = await supabase
          .from('projects')
          .select(`
            *,
            staff!projects_manager_id_fkey(full_name)
          `)
          .eq('id', id)
          .maybeSingle();

        let projData = dbProj ? { ...dbProj } : null;

        // --- REAL-TIME APEC GLOBAL DATABASE MERGE CHO PROJECT DETAILS ---
        try {
          const apecProjectsRes = await fetch('/api/v1/apec-global/projects').then(r => r.json()).catch(() => ({ success: false, items: [] }));
          if (apecProjectsRes.success && apecProjectsRes.items) {
            const livePrjs = apecProjectsRes.items || [];
            const idStr = String(id).replace('apec_prj_', '').toLowerCase();
            const matchingApecPrj = livePrjs.find((p: any) => 
              String(p.id).toLowerCase() === idStr ||
              `p-${p.id}`.toLowerCase() === idStr ||
              (p.code && p.code.toLowerCase() === idStr) ||
              (projData && (
                p.code?.toLowerCase() === projData.code?.toLowerCase() ||
                p.name?.toLowerCase().trim() === projData.name?.toLowerCase().trim()
              ))
            );

            if (matchingApecPrj) {
              if (projData) {
                projData = {
                  ...projData,
                  name: matchingApecPrj.name || matchingApecPrj.project_name || matchingApecPrj.title || projData.name,
                  code: matchingApecPrj.code || `P-${matchingApecPrj.id}`,
                  description: matchingApecPrj.description || projData.description,
                  start_date: matchingApecPrj.start_date || projData.start_date,
                  end_date: matchingApecPrj.end_date || projData.end_date,
                  isRealtimeApec: true
                };
              } else {
                projData = {
                  id: String(id),
                  name: matchingApecPrj.name || matchingApecPrj.project_name || matchingApecPrj.title || `Dự án APEC ${matchingApecPrj.id}`,
                  code: matchingApecPrj.code || `P-${matchingApecPrj.id}`,
                  description: matchingApecPrj.description || `Dự án từ cơ sở dữ liệu Apec Global (${matchingApecPrj.code || matchingApecPrj.id})`,
                  status: 'active',
                  progress_percentage: Number(matchingApecPrj.progress) || 0,
                  start_date: matchingApecPrj.start_date || new Date().toISOString(),
                  end_date: matchingApecPrj.end_date || null,
                  organization_id: activeOrganization?.id || null,
                  isRealtimeApec: true
                };
              }
            }
          }
        } catch (apecErr) {
          console.warn('Realtime Apec project fetch warning:', apecErr);
        }
        // --- END REAL-TIME MERGE ---

        if (projData) {
          setProject(projData)
          
          // Fetch org projects for quick switcher
          if (projData.organization_id) {
            const { data: orgProjs } = await supabase
              .from('projects')
              .select('id, name')
              .eq('organization_id', projData.organization_id)
              .is('deleted_at', null)
              .order('name')
            if (orgProjs) setOrgProjects(orgProjs)
          }
        }

        // Fetch Checklist Items for tasks count — 100% TỪ APEC GLOBAL
        let taskTotal = 0
        let taskCompleted = 0
        let taskTodo = 0
        let taskInProgress = 0
        let taskReview = 0
        let checklistTotal = 0
        let checklistCompleted = 0
        
        let overdueTasks = 0
        let doneThisWeek = 0
        let upcomingTasks: any[] = []
        
        const now = new Date()
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        try {
          const [apecTasksStatsRes, apecTypesStatsRes] = await Promise.all([
            fetch('/api/v1/apec-global/tasks').then(r => r.json()).catch(() => ({ success: false, items: [] })),
            fetch('/api/v1/apec-global/checklists').then(r => r.json()).catch(() => ({ success: false, items: [] }))
          ]);

          const prjCodeL = projData?.code?.toLowerCase() || '';
          const prjNameL = projData?.name?.toLowerCase().trim() || '';

          // Lọc tasks thuộc dự án hiện tại từ Apec Global
          const isDefaultApecProjectL = prjCodeL === 'p-62' || prjCodeL === 'p-81' || String(id) === '62' || String(id) === 'apec_62' || String(id) === 'apec' || (prjNameL && prjNameL.includes('apec global'));
          const projectTasks = (apecTasksStatsRes.items || []).filter((t: any) => {
            if (!t.project || (!t.project.id && !t.project.name)) {
              return isDefaultApecProjectL;
            }
            const tPrjIdStr = String(t.project.id || '').toLowerCase();
            const tPrjCode = `p-${tPrjIdStr}`;
            const tPrjName = String(t.project.name || '').toLowerCase().trim();
            return (
              tPrjIdStr === String(id).toLowerCase() ||
              tPrjCode === prjCodeL ||
              (prjNameL && tPrjName === prjNameL) ||
              (prjNameL && tPrjName && (prjNameL.includes(tPrjName) || tPrjName.includes(prjNameL))) ||
              (isDefaultApecProjectL && tPrjName.includes('apec global'))
            );
          });

          // Đếm theo task type (checklist)
          const taskTypes = apecTypesStatsRes.items || [];
          checklistTotal = taskTypes.length || 3;

          taskTotal = projectTasks.length;
          projectTasks.forEach((t: any) => {
            let progressVal = Number(t.progress || t.process) || 0;
            const subVals: number[] = [];
            if (Array.isArray(t.employee_assignments)) {
              t.employee_assignments.forEach((ea: any) => {
                if (Array.isArray(ea.subtasks)) {
                  ea.subtasks.forEach((st: any) => subVals.push(Number(st.process || st.progress || 0)));
                }
              });
            }
            if (Array.isArray(t.subtasks)) {
              t.subtasks.forEach((st: any) => subVals.push(Number(st.process || st.progress || 0)));
            }
            if (subVals.length > 0) {
              const subtaskAvg = Math.round(subVals.reduce((acc, c) => acc + c, 0) / subVals.length);
              progressVal = progressVal > 0 ? Math.max(progressVal, subtaskAvg) : subtaskAvg;
            }

            // Đọc status chính xác từ APEC Global API (object {id, name} | string | number)
            const rawStatus = t.status;
            let resolvedStatus = 'todo';
            if (progressVal >= 100) {
              resolvedStatus = 'done';
            } else if (rawStatus && typeof rawStatus === 'object') {
              const sId = Number(rawStatus.id);
              const sName = String(rawStatus.name || '').toLowerCase();
              if (sId === 4 || sName.includes('hoàn thành') || sName.includes('done')) resolvedStatus = 'done';
              else if (sId === 3 || sName.includes('chờ duyệt') || sName.includes('review') || sName.includes('duyệt')) resolvedStatus = 'review';
              else if (sId === 2 || sName.includes('đang') || sName.includes('thực hiện') || sName.includes('in_progress')) resolvedStatus = 'in_progress';
              else resolvedStatus = 'todo';
            } else if (typeof rawStatus === 'string') {
              const s = rawStatus.toLowerCase();
              if (s === 'done' || s.includes('hoàn thành')) resolvedStatus = 'done';
              else if (s === 'review' || s.includes('chờ duyệt')) resolvedStatus = 'review';
              else if (s === 'in_progress' || s.includes('đang')) resolvedStatus = 'in_progress';
              else resolvedStatus = 'todo';
            } else if (typeof rawStatus === 'number') {
              if (rawStatus === 4) resolvedStatus = 'done';
              else if (rawStatus === 3) resolvedStatus = 'review';
              else if (rawStatus === 2) resolvedStatus = 'in_progress';
              else resolvedStatus = 'todo';
            } else {
              resolvedStatus = progressVal >= 100 ? 'done' : progressVal > 0 ? 'in_progress' : 'todo';
            }

            if (resolvedStatus === 'done') taskCompleted++;
            else if (resolvedStatus === 'review') taskReview++;
            else if (resolvedStatus === 'in_progress') taskInProgress++;
            else taskTodo++;

            const endDate = t.date_end || t.end_date || t.due_date;
            if (endDate) {
              const ed = new Date(endDate);
              if (ed < now && resolvedStatus !== 'done') overdueTasks++;
              if (ed >= now && resolvedStatus !== 'done') {
                upcomingTasks.push({ title: t.title || t.name, end_date: endDate });
              }
            }
          });

          // Đếm checklist hoàn thành
          const typeNames = taskTypes.map((tt: any) => (tt.name || '').toLowerCase().trim());
          typeNames.forEach((tn: string) => {
            const tasksInType = projectTasks.filter((t: any) => (t.type?.name || '').toLowerCase().trim() === tn);
            if (tasksInType.length > 0 && tasksInType.every((t: any) => Number(t.progress || t.process) >= 100)) {
              checklistCompleted++;
            }
          });

        } catch (statsErr) {
          console.warn('Lỗi khi tính thống kê từ Apec Global:', statsErr);
        }

        upcomingTasks.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
        const nextMilestone = upcomingTasks.length > 0 ? upcomingTasks[0] : null

        // Fetch Incidents count
        const { data: incidents } = await supabase
          .from('incidents')
          .select('status, created_at')
          .eq('project_id', id)
          .is('deleted_at', null)

        let incidentsTotal = incidents?.length || 0
        let incidentsFixed = incidents?.filter(i => i.status === 'fixed' || i.status === 'closed').length || 0
        
        let newBugs = incidents?.filter(i => new Date(i.created_at) > lastWeek).length || 0

        // Fetch Improvements count (if table exists)
        let improvementsTotal = 0
        try {
          const { data: improvements } = await supabase
            .from('improvements')
            .select('id')
            .eq('project_id', id)
          improvementsTotal = improvements?.length || 0
        } catch (e: any) {
          if (e) {
            console.warn('Improvements table might not be ready')
          }
        }

        const pct = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0

        setStats({
          progress: pct,
          checklistTotal,
          checklistCompleted,
          taskTotal,
          taskCompleted,
          incidentsTotal,
          incidentsFixed,
          newBugs,
          onTimeRate: taskTotal > 0 ? Math.round(((taskTotal - overdueTasks) / taskTotal) * 100) : 100,
          improvementsTotal,
          taskTodo,
          taskInProgress,
          taskReview,
          overdueTasks,
          doneThisWeek,
          nextMilestone
        } as any)

      } catch (err) {
        console.error('Error loading project data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      loadProject()
    }
  }, [id])

  // Redirect if organization changes while viewing this project
  useEffect(() => {
    if (project && project.organization_id && activeOrganization && project.organization_id !== activeOrganization.id && !project.isRealtimeApec) {
      router.push('/dashboard/projects')
    }
  }, [project, activeOrganization, router])

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

  if (!project) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy dự án</h2>
        <button 
          onClick={() => router.push('/dashboard/projects')}
          className="mt-4 text-blue-600 font-medium hover:underline"
        >
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    if (!amount) return '0đ'
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
  }

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      try {
        await fetch('/api/v1/apec-global/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: project.id, status: newStatus }),
        });
      } catch (e) {
        console.warn('Lỗi đồng bộ APEC GLOBAL khi cập nhật trạng thái dự án:', e);
      }

      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', project.id)

      if (error) throw error
      setProject({ ...project, status: newStatus })
    } catch (err) {
      console.error('Error updating status:', err)
      await customAlert('Không thể cập nhật trạng thái')
    }
  }

  const handleProgressChange = (statsUpdate: any) => {
    setStats(prev => ({
      ...prev,
      ...statsUpdate
    }))
  }

  const handleDuplicateProject = async () => {
    if (!(await customConfirm('Bạn có chắc chắn muốn nhân bản toàn bộ dự án này không?'))) return
    setIsLoading(true)
    try {
      // 1. Duplicate project
      const { data: newProject, error: projectError } = await supabase.from('projects').insert({
        name: `${project.name} (Bản sao)`,
        description: project.description,
        status: 'planning',
        start_date: project.start_date,
        end_date: project.end_date,
        priority: project.priority,
        budget: project.budget,
        manager_id: project.manager_id,
        organization_id: project.organization_id,
        client: project.client,
        department: project.department
      }).select().single()

      if (projectError) throw projectError

      // 2. Duplicate checklists and items
      const { data: originalChecklists, error: checkErr } = await supabase
        .from('project_checklists')
        .select('*, checklist_items(*)')
        .eq('project_id', project.id)

      if (!checkErr && originalChecklists && originalChecklists.length > 0) {
        for (const list of originalChecklists) {
          const { data: newList, error: newListErr } = await supabase.from('project_checklists').insert({
            title: list.title,
            project_id: newProject.id,
            sort_order: list.sort_order
          }).select().single()

          if (!newListErr && newList && list.checklist_items && list.checklist_items.length > 0) {
            const newItems = list.checklist_items.map((item: any) => ({
              checklist_id: newList.id,
              title: item.title,
              description: item.description,
              priority: item.priority,
              start_date: item.start_date,
              end_date: item.end_date,
              sort_order: item.sort_order,
              assigned_staff_id: item.assigned_staff_id || null,
              status: 'todo',
              is_completed: false,
              progress: 0
            }))
            await supabase.from('checklist_items').insert(newItems)
          }
        }
      }
      
      // 3. Duplicate project members
      const { data: originalMembers, error: memErr } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', project.id)
        
      if (!memErr && originalMembers && originalMembers.length > 0) {
        const newMembers = originalMembers.map(m => ({
          project_id: newProject.id,
          user_id: m.user_id,
          role_id: m.role_id
        }))
        await supabase.from('project_members').insert(newMembers)
      }

      router.push(`/dashboard/projects/${newProject.id}`)
    } catch (err: any) {
      console.error(err)
      await customAlert('Lỗi khi nhân bản dự án: ' + err.message)
      setIsLoading(false)
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'on_hold':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'cancelled':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200'
    }
  }

  return (
    <div className="pb-10 font-sans max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
      </div>

      <div ref={componentRef} className="print:p-8 bg-slate-50/50 p-6 rounded-3xl">
        
        {/* Header Title Bar */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl shadow-sm">
            {project.name ? project.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div className="flex-1 pt-0.5 relative">
            <div className="flex items-center gap-2 mb-1 relative">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{project.name}</h1>
              <button 
                onClick={() => setShowProjectDropdown(!showProjectDropdown)} 
                className="group flex items-center gap-1.5 p-1.5 hover:bg-blue-50 rounded-xl text-slate-500 hover:text-blue-600 transition-all ml-1 border border-transparent hover:border-blue-100"
              >
                <div className="bg-slate-100 group-hover:bg-blue-100 p-1 rounded-lg transition-colors shadow-sm">
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </div>
                <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wide whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity">
                  Click Xem dự án khác tại đây
                </span>
              </button>
              
              {showProjectDropdown && (
                <>
                  <button
                    type="button"
                    aria-label="Close dropdown"
                    className="fixed inset-0 z-40 w-full h-full cursor-default bg-transparent border-0 outline-none"
                    onClick={() => setShowProjectDropdown(false)}
                  ></button>
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dự án cùng tổ chức</div>
                      {orgProjects.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => {
                             setShowProjectDropdown(false)
                             if (p.id !== project.id) router.push(`/dashboard/projects/${p.id}`)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${p.id === project.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{project.code || `PRJ-${project.id.substring(0,6)}`}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <select
                value={project.status || 'planning'}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${getStatusStyles(project.status || 'planning')}`}
              >
                <option value="planning">Chưa bắt đầu</option>
                <option value="active">Đang thực hiện</option>
                <option value="on_hold">Tạm dừng</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={openReportModal}
              disabled={isPreparingReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 hover:bg-green-50 border border-green-200 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isPreparingReport ? 'animate-pulse' : ''}`} /> Xuất Excel
            </button>
            <button 
              onClick={openReportModal}
              disabled={isPreparingReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <Printer className={`w-3.5 h-3.5 ${isPreparingReport ? 'animate-pulse' : ''}`} /> In PDF
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="mb-4">
          <ProjectTopStats stats={stats} />
        </div>


        {/* Tổng quan (1 dòng ngang) */}
        <div className="mb-4">
          <ProjectLeftSidebar 
            project={project} 
            progress={stats.progress} 
            formatCurrency={formatCurrency} 
            onProjectUpdated={setProject}
            onDuplicateProject={handleDuplicateProject}
          />
        </div>

        {/* Bảng Checklist (1 dòng ngang) */}
        <div className="mb-4">
          <ProjectChecklistTable 
            projectId={project.id} 
            organizationId={project.organization_id} 
            onProgressChange={handleProgressChange}
          />
        </div>

        {/* Tình trạng & Kết quả (1 dòng ngang) */}
        <div className="mb-4">
          <ProjectRightSidebar 
            stats={{
              todo: stats.taskTodo || 0,
              inProgress: stats.taskInProgress || 0,
              review: stats.taskReview || 0,
              done: stats.taskCompleted || 0
            }}
          />
        </div>

        {/* Bottom Section */}
        <div className="mt-4">
          <ProjectBottomSection projectId={project?.id} />
        </div>

      </div>
      <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden">
        <ProjectPrintTemplate
          ref={printTemplateRef}
          project={project}
          stats={stats}
          fullData={fullData}
          selectedChecklistIds={reportSelections.selectedChecklistIds}
          includeIncidents={reportSelections.includeIncidents}
          includeImprovements={reportSelections.includeImprovements}
          includeMembers={reportSelections.includeMembers}
        />
      </div>
      <PrintReportModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        checklists={(fullData?.checklists || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          count: c.checklist_items?.length || 0
        }))}
        onConfirmPrint={handleConfirmPrint}
        onConfirmExcel={handleConfirmExcel}
      />
    </div>
  )
}
