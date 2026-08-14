import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import {
  getApecTasks,
  getApecTaskTypes,
  getApecEmployees,
  getApecProjects
} from '@/lib/services/apec-global-api';
import { z } from 'zod';
import { getCachedOrFetch } from '@/lib/services/server-cache';
import { isItemDeleted } from '@/lib/services/deleted-items-store';

// Phase 1 Schema Validation
const isUuid = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const ApecTaskSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  project: z.any().optional(),
  type: z.any().optional(),
  type_name: z.string().nullable().optional(),
  employee_assignments: z.array(z.any()).nullable().optional(),
  status: z.any().optional(),
  priority: z.any().optional(),
  date_start: z.string().nullable().optional(),
  date_end: z.string().nullable().optional(),
  process: z.union([z.string(), z.number()]).nullable().optional(),
  progress: z.union([z.string(), z.number()]).nullable().optional(),
}).passthrough();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase } = await authenticateApiRequest(request);
    
    // Auth Check - Log info if unauthorized, but proceed for APEC Global REST data
    if (!authorized) {
      console.warn('[BoardData] Unauthenticated request, proceeding with APEC Global REST data');
    }

    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams?.id;
    
    // In-memory cache key
    const cacheKey = `board-data:${projectId}`;
    
    const result = await getCachedOrFetch(cacheKey, async () => {
      // 1. Fetch Local Project Info & Local Incidents / Improvements
      let localPrjCode = '';
      let localPrjName = '';
      let localIncidents: any[] = [];
      let localImprovements: any[] = [];
      
      if (supabase) {
        try {
          const [localPrjRes, incRes, impRes] = await Promise.all([
            supabase.from('projects').select('id, code, name').eq('id', projectId).maybeSingle(),
            supabase.from('incidents').select('*, profiles:reported_by(full_name), staff:assigned_to(full_name)').or(`project_id.eq.${projectId},organization_id.eq.${projectId}`).is('deleted_at', null),
            supabase.from('improvements').select('*, profiles:reporter_id(full_name), staff:assigned_to(full_name)').or(`project_id.eq.${projectId},organization_id.eq.${projectId}`).is('deleted_at', null)
          ]);
          
          localPrjCode = localPrjRes.data?.code?.toLowerCase() || '';
          localPrjName = localPrjRes.data?.name?.toLowerCase().trim() || '';
          localIncidents = (incRes.data || []).filter((inc: any) => !isItemDeleted(inc.id, inc.title) && !isItemDeleted(`inc_${inc.id}`));
          localImprovements = (impRes.data || []).filter((imp: any) => !isItemDeleted(imp.id, imp.title) && !isItemDeleted(`imp_${imp.id}`));
        } catch (err) {
          console.warn('Lỗi đọc local supabase records:', err);
        }
      }

      // 2. Fetch APEC Data in Parallel
      const [apecTasksRes, apecTypesRes, apecEmpRes, apecProjectsRes] = await Promise.all([
        getApecTasks({ page: 1, limit: 1000 }).catch(() => ({ items: [] })),
        getApecTaskTypes({ page: 1, limit: 100 }).catch(() => ({ items: [] })),
        getApecEmployees({ page: 1, limit: 500 }).catch(() => ({ items: [] })),
        getApecProjects({ page: 1, limit: 100 }).catch(() => ({ items: [] }))
      ]);

      // 3. Hydrate Employees (Map id -> Department info)
      const apecEmployees = apecEmpRes.items || [];
      const staffMap = new Map<string, any>();
      const staffList: any[] = [];
      
      apecEmployees.forEach((e: any) => {
        const empName = (e.fullname || e.name || '').trim();
        if (empName || e.id) {
          const staffItem = {
            id: `apec_${e.id}`,
            raw_id: e.id,
            full_name: empName,
            avatar: e.avatar || null,
            position: e.position || e.job_title || '',
            department: (e.department && typeof e.department === 'object' ? e.department.name : (e.department_name || e.department || '')),
            email: e.email || ''
          };
          if (e.id) staffMap.set(String(e.id), staffItem);
          staffList.push(staffItem);
        }
      });

      // 4. Resolve APEC Project ID
      const apecProjects = apecProjectsRes.items || [];
      const isDefaultApecProject = localPrjCode === 'p-62' || localPrjCode === 'p-81' || String(projectId) === '62' || String(projectId) === 'apec_62' || String(projectId) === 'apec' || (localPrjName && localPrjName.includes('apec global'));

      const currentPrj = apecProjects.find((p: any) =>
        String(p.id) === String(projectId) ||
        `p-${p.id}` === String(projectId).toLowerCase() ||
        (p.code && p.code.toLowerCase() === localPrjCode) ||
        (p.name && localPrjName && p.name.toLowerCase().trim() === localPrjName)
      );

      const resolvedApecProjectId = currentPrj ? currentPrj.id : (isDefaultApecProject ? 62 : undefined);

      // 5. Filter & Validate Tasks
      const allTasks = apecTasksRes.items || [];
      const validTasks = allTasks.map((t: any) => {
        const parsed = ApecTaskSchema.safeParse(t);
        if (!parsed.success) {
          console.warn(`[Zod Warning] Task ID ${t.id} has schema issues:`, parsed.error.issues);
          return t; // Fallback, we still return it for now to avoid data loss
        }
        return parsed.data;
      }).filter(Boolean);

      const projectTasks = validTasks.filter((t: any) => {
        if (isItemDeleted(t.id, t.name || t.title) || isItemDeleted(`inc_${t.id}`) || isItemDeleted(`apec_${t.id}`)) {
          return false;
        }
        if (!t.project || (!t.project.id && !t.project.name)) {
          return isDefaultApecProject;
        }
        const tPrjIdStr = String(t.project.id || '').toLowerCase();
        const tPrjCode = `p-${tPrjIdStr}`;
        const tPrjName = String(t.project.name || '').toLowerCase().trim();
        return (
          tPrjIdStr === String(projectId).toLowerCase() ||
          tPrjCode === localPrjCode ||
          (localPrjName && tPrjName === localPrjName) ||
          (localPrjName && tPrjName && (localPrjName.includes(tPrjName) || tPrjName.includes(localPrjName))) ||
          (currentPrj && String(t.project.id) === String(currentPrj.id)) ||
          (isDefaultApecProject && tPrjName.includes('apec global'))
        );
      });

      // Tích hợp Sự cố & Cải tiến từ Supabase nếu chưa có trên APEC Tasks, đồng thời đồng bộ 2 chiều trạng thái
      const syncPromises: Promise<any>[] = [];
      
      localIncidents.forEach((inc: any) => {
        const cleanIncId = String(inc.checklist_item_id || inc.id || '').replace(/^apec_/, '').replace(/^inc_/, '').replace(/^imp_/, '');
        const matchingTask = projectTasks.find((t: any) => {
          const cleanTaskId = String(t.id || '').replace(/^apec_/, '');
          return cleanTaskId === cleanIncId ||
                 (t.name && inc.title && t.name.trim().toLowerCase() === inc.title.trim().toLowerCase()) ||
                 (t.title && inc.title && t.title.trim().toLowerCase() === inc.title.trim().toLowerCase());
        });

        if (matchingTask) {
          // Tự động đồng bộ trạng thái từ APEC Task về Incidents nếu có sự đứt gãy
          const taskProc = Number(matchingTask.process ?? matchingTask.progress ?? 0);
          const taskStatusId = Number(matchingTask.status?.id || matchingTask.task_status?.id || matchingTask.status);
          const statusName = String(matchingTask.status?.name || matchingTask.status || '').toLowerCase();
          
          const isTaskDone = taskStatusId === 4 || Boolean(matchingTask.is_completed) || 
                             statusName.includes('hoàn thành') || statusName.includes('đã duyệt') || statusName === 'done' || statusName === 'completed' || statusName === 'resolved';
          
          let expectedIncStatus = 'new';
          if (isTaskDone) expectedIncStatus = 'resolved';
          else if (taskStatusId === 3 || statusName.includes('chờ duyệt') || statusName === 'review' || taskProc >= 100) expectedIncStatus = 'review';
          else if (taskProc > 0 || taskStatusId === 2 || statusName.includes('đang thực hiện') || statusName === 'in_progress' || statusName === 'investigating' || statusName === 'fixing') expectedIncStatus = 'investigating';

          let updatePayload: any = {};
          let needsUpdate = false;
          
          if (inc.status !== expectedIncStatus) {
            updatePayload.status = expectedIncStatus;
            needsUpdate = true;
          }

          // Kiểm tra đồng bộ Phòng ban, Assignee, Project...
          const apecProjectId = matchingTask.project?.id || matchingTask.project_id;
          if (apecProjectId && String(inc.project_id) !== String(apecProjectId) && isUuid(apecProjectId)) {
            updatePayload.project_id = String(apecProjectId);
            needsUpdate = true;
          }
          
          const apecAssigneeId = matchingTask.employee_assignments?.[0]?.employee?.id || matchingTask.assignee?.id;
          if (apecAssigneeId && String(inc.assigned_to) !== String(apecAssigneeId) && isUuid(apecAssigneeId)) {
            updatePayload.assigned_to = String(apecAssigneeId);
            needsUpdate = true;
          }

          const apecDepartmentId = matchingTask.department?.id || matchingTask.department_id;
          if (apecDepartmentId && String(inc.department_id) !== String(apecDepartmentId) && isUuid(apecDepartmentId)) {
            updatePayload.department_id = String(apecDepartmentId);
            needsUpdate = true;
          }

          const apecReporterId = matchingTask.reporter_id || matchingTask.created_by || matchingTask.user_id;
          if (apecReporterId && String(inc.reported_by) !== String(apecReporterId) && isUuid(apecReporterId)) {
            updatePayload.reported_by = String(apecReporterId);
            needsUpdate = true;
          }

          if (needsUpdate && isUuid(inc.id)) {
            updatePayload.updated_at = new Date().toISOString();
            // Cập nhật memory ngay lập tức
            Object.assign(inc, updatePayload);
            const p = supabase.from('incidents').update(updatePayload).eq('id', inc.id).then(({ error }) => {
              if (error) console.warn('[BoardData] Auto-sync incident error:', error.message);
              return true;
            });
            syncPromises.push(p as Promise<any>);
          }

          // Gán cờ đánh dấu task này là sự cố
          matchingTask.is_incident = true;
          matchingTask.severity = inc.severity || matchingTask.severity;
        } else {
          const incStatus = (inc.status === 'resolved' || inc.status === 'closed') ? { id: 4, name: 'Hoàn thành' } :
                           (inc.status === 'review') ? { id: 3, name: 'Chờ duyệt' } :
                           (inc.status === 'investigating' || inc.status === 'fixing' || inc.status === 'in_progress') ? { id: 2, name: 'Đang thực hiện' } :
                           { id: 1, name: 'Chưa thực hiện' };
          const assigneeName = inc.staff?.full_name || 'Chưa phân công';
          projectTasks.push({
            id: inc.checklist_item_id || `inc_${inc.id}`,
            name: inc.title,
            title: inc.title,
            description: inc.description || '',
            process: (inc.status === 'resolved' || inc.status === 'closed') ? 100 : 0,
            target_value: Number(inc.target_value || 100),
            kpi_item_id: Number(inc.kpi_item_id || 47),
            status: incStatus,
            task_status: incStatus,
            type: { id: 'incident', name: 'SỰ CỐ & RỦI RO' },
            type_name: 'SỰ CỐ & RỦI RO',
            is_incident: true,
            severity: inc.severity,
            employee_assignments: inc.assigned_to ? [{
              id: `ea_inc_${inc.id}`,
              name: `Xử lý sự cố: ${inc.title}`,
              employee: {
                id: inc.assigned_to,
                full_name: assigneeName,
                name: assigneeName,
                avatar: null,
                department: 'Ban xử lý sự cố'
              },
              process: inc.status === 'resolved' ? 100 : 0,
              checked: inc.status === 'resolved'
            }] : [],
            subtasks: []
          });
        }
      });

      localImprovements.forEach((imp: any) => {
        const cleanImpId = String(imp.checklist_item_id || imp.id || '').replace(/^apec_/, '').replace(/^inc_/, '').replace(/^imp_/, '');
        const matchingTask = projectTasks.find((t: any) => {
          const cleanTaskId = String(t.id || '').replace(/^apec_/, '');
          return cleanTaskId === cleanImpId ||
                 (t.name && imp.title && t.name.trim().toLowerCase() === imp.title.trim().toLowerCase()) ||
                 (t.title && imp.title && t.title.trim().toLowerCase() === imp.title.trim().toLowerCase());
        });

        if (matchingTask) {
          const taskProc = Number(matchingTask.process ?? matchingTask.progress ?? 0);
          const taskStatusId = Number(matchingTask.status?.id || matchingTask.task_status?.id || matchingTask.status);
          const statusName = String(matchingTask.status?.name || matchingTask.status || '').toLowerCase();
          
          const isTaskDone = taskStatusId === 4 || Boolean(matchingTask.is_completed) || 
                             statusName.includes('hoàn thành') || statusName.includes('đã duyệt') || statusName === 'done' || statusName === 'completed' || statusName === 'implemented';
          
          let expectedImpStatus = 'pending';
          if (isTaskDone) expectedImpStatus = 'implemented';
          else if (taskStatusId === 3 || statusName.includes('chờ duyệt') || statusName === 'review' || taskProc >= 100) expectedImpStatus = 'review';
          else if (taskProc > 0 || taskStatusId === 2 || statusName.includes('đang thực hiện') || statusName === 'in_progress' || statusName === 'evaluating') expectedImpStatus = 'in_progress';

          let updatePayload: any = {};
          let needsUpdate = false;
          
          if (imp.status !== expectedImpStatus) {
            updatePayload.status = expectedImpStatus;
            needsUpdate = true;
          }

          const apecProjectId = matchingTask.project?.id || matchingTask.project_id;
          if (apecProjectId && String(imp.project_id) !== String(apecProjectId) && isUuid(apecProjectId)) {
            updatePayload.project_id = String(apecProjectId);
            needsUpdate = true;
          }
          
          const apecAssigneeId = matchingTask.employee_assignments?.[0]?.employee?.id || matchingTask.assignee?.id;
          if (apecAssigneeId && String(imp.assigned_to) !== String(apecAssigneeId) && isUuid(apecAssigneeId)) {
            updatePayload.assigned_to = String(apecAssigneeId);
            needsUpdate = true;
          }

          const apecDepartmentId = matchingTask.department?.id || matchingTask.department_id;
          if (apecDepartmentId && String(imp.department_id) !== String(apecDepartmentId) && isUuid(apecDepartmentId)) {
            updatePayload.department_id = String(apecDepartmentId);
            needsUpdate = true;
          }

          const apecReporterId = matchingTask.reporter_id || matchingTask.created_by || matchingTask.user_id;
          if (apecReporterId && String(imp.reporter_id) !== String(apecReporterId) && isUuid(apecReporterId)) {
            updatePayload.reporter_id = String(apecReporterId);
            needsUpdate = true;
          }

          if (needsUpdate && isUuid(imp.id)) {
            updatePayload.updated_at = new Date().toISOString();
            Object.assign(imp, updatePayload);
            const p = supabase.from('improvements').update(updatePayload).eq('id', imp.id).then(({ error }) => {
              if (error) console.warn('[BoardData] Auto-sync improvement error:', error.message);
              return true;
            });
            syncPromises.push(p as Promise<any>);
          }

          matchingTask.is_improvement = true;
        } else {
          const impStatus = (imp.status === 'implemented' || imp.status === 'approved' || imp.status === 'done') ? { id: 4, name: 'Hoàn thành' } :
                           (imp.status === 'review') ? { id: 3, name: 'Chờ duyệt' } :
                           (imp.status === 'in_progress' || imp.status === 'evaluating') ? { id: 2, name: 'Đang thực hiện' } :
                           { id: 1, name: 'Chưa thực hiện' };
          const assigneeName = imp.staff?.full_name || 'Chưa phân công';
          projectTasks.push({
            id: imp.checklist_item_id || `imp_${imp.id}`,
            name: imp.title,
            title: imp.title,
            description: imp.description || '',
            process: imp.status === 'implemented' ? 100 : 0,
            target_value: Number(imp.target_value || 100),
            kpi_item_id: Number(imp.kpi_item_id || 47),
            status: impStatus,
            task_status: impStatus,
            type: { id: 'improvement', name: 'CẢI TIẾN & NÂNG CẤP' },
            type_name: 'CẢI TIẾN & NÂNG CẤP',
            is_improvement: true,
            employee_assignments: imp.assigned_to ? [{
              id: `ea_imp_${imp.id}`,
              name: `Thực hiện cải tiến: ${imp.title}`,
              employee: {
                id: imp.assigned_to,
                full_name: assigneeName,
                name: assigneeName,
                avatar: null,
                department: 'Ban cải tiến'
              },
              process: imp.status === 'implemented' ? 100 : 0,
              checked: imp.status === 'implemented'
            }] : [],
            subtasks: []
          });
        }
      });

      // 6. Build Task Types / Checklists Tree
      const abandonedTypes = ['HẰNG NGÀY', 'CHUNG', 'CÁ NHÂN'];
      const taskTypes = (apecTypesRes.items || []).filter((tt: any) => 
        !abandonedTypes.includes((tt.name || tt.title || '').trim().toUpperCase()) &&
        !isItemDeleted(tt.id, tt.name || tt.title)
      );

      if (!taskTypes.some((tt: any) => (tt.name || tt.title || '').trim().toUpperCase() === 'NHẬT KÝ CHUYÊN MÔN')) {
        taskTypes.push({ id: 1, name: 'NHẬT KÝ CHUYÊN MÔN' });
      }

      // Đảm bảo luôn có Checklist SỰ CỐ & RỦI RO
      if (!taskTypes.some((tt: any) => {
        const n = (tt.name || tt.title || '').trim().toUpperCase();
        return n.includes('SỰ CỐ') || n.includes('RỦI RO');
      })) {
        taskTypes.push({ id: 'incident', name: 'SỰ CỐ & RỦI RO' });
      }

      // Đảm bảo luôn có Checklist CẢI TIẾN & NÂNG CẤP
      if (!taskTypes.some((tt: any) => {
        const n = (tt.name || tt.title || '').trim().toUpperCase();
        return n.includes('CẢI TIẾN') || n.includes('NÂNG CẤP');
      })) {
        taskTypes.push({ id: 'improvement', name: 'CẢI TIẾN & NÂNG CẤP' });
      }

      const checklists = taskTypes.map((tt: any, idx: number) => {
        const typeName = tt.name || tt.title || `Loại ${tt.id}`;
        const targetName = typeName.toUpperCase().trim();
        const isIncidentTarget = targetName.includes('SỰ CỐ') || targetName.includes('RỦI RO');
        const isImprovementTarget = targetName.includes('CẢI TIẾN') || targetName.includes('NÂNG CẤP');
        const ttIdStr = String(tt.id || '');

        const tasksForThisType = projectTasks.filter((t: any) => {
          const tTypeName = (t.type?.name || t.type_name || '').toUpperCase().trim();
          const tTypeIdStr = String(t.type?.id || t.type_task || t.type_id || t.checklist_id || '');

          // 1. Phân loại cho Checklist Sự cố
          if (isIncidentTarget) {
            return Boolean(
              t.is_incident ||
              tTypeName.includes('SỰ CỐ') ||
              tTypeName.includes('RỦI RO') ||
              (ttIdStr && tTypeIdStr === ttIdStr)
            );
          }

          // 2. Phân loại cho Checklist Cải tiến
          if (isImprovementTarget) {
            return Boolean(
              t.is_improvement ||
              tTypeName.includes('CẢI TIẾN') ||
              tTypeName.includes('NÂNG CẤP') ||
              (ttIdStr && tTypeIdStr === ttIdStr)
            );
          }

          // 3. Các Checklist khác: Không nhận nhiệm vụ Sự cố / Cải tiến
          if (
            t.is_incident ||
            t.is_improvement ||
            tTypeName.includes('SỰ CỐ') ||
            tTypeName.includes('RỦI RO') ||
            tTypeName.includes('CẢI TIẾN') ||
            tTypeName.includes('NÂNG CẤP')
          ) {
            return false;
          }

          if (ttIdStr && tTypeIdStr === ttIdStr) return true;
          if (targetName === 'NHẬT KÝ CHUYÊN MÔN' && (!tTypeName || abandonedTypes.includes(tTypeName))) return true;
          return tTypeName === targetName;
        });

        // Normalize Task -> Assignees -> Subtasks
        const deptMap = new Map<string, any[]>();

        tasksForThisType.forEach((t: any) => {
          const ea = Array.isArray(t.employee_assignments) ? t.employee_assignments : [];
          
          const hydratedAssignments = ea.map((assign: any) => {
            const empId = assign.employee?.id;
            const staffInfo = empId ? staffMap.get(String(empId)) : null;
            const hydratedEmp = staffInfo || {
              id: empId,
              full_name: assign.employee?.name || assign.employee?.fullname || 'Không xác định',
              name: assign.employee?.name || assign.employee?.fullname || 'Không xác định',
              avatar: assign.employee?.avatar || null,
              department: 'Chưa phân bổ / Khác'
            };
            return {
              ...assign,
              title: assign.name || assign.title || `Nhiệm vụ của ${hydratedEmp.full_name}`,
              name: assign.name || assign.title || `Nhiệm vụ của ${hydratedEmp.full_name}`,
              employee: hydratedEmp,
              hydrated_employee: hydratedEmp
            };
          });

          const firstAssignee = hydratedAssignments[0]?.hydrated_employee;
          const deptName = firstAssignee?.department || 'Chưa phân bổ / Khác';

          // Extract real nested subtasks from t.subtasks or ea.subtasks
          const extractedSubtasks: any[] = [];
          if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
            t.subtasks.forEach((st: any) => {
              const empId = st.employee?.id || st.employee_id;
              const staffInfo = empId ? staffMap.get(String(empId)) : null;
              const stProc = Number(st.process || st.progress || 0);
              const isChecked = Boolean(st.checked || stProc >= 100);
              let stStatusObj = st.status;
              if (isChecked) {
                stStatusObj = { id: 4, name: 'Hoàn thành' };
              } else if (stProc > 0) {
                stStatusObj = { id: 2, name: 'Đang thực hiện' };
              } else {
                stStatusObj = { id: 1, name: 'Chưa thực hiện' };
              }

              extractedSubtasks.push({
                ...st,
                id: st.id,
                title: st.name || st.title || 'Công việc con',
                name: st.name || st.title || 'Công việc con',
                checked: isChecked,
                process: stProc,
                progress: stProc,
                status: stStatusObj,
                employee: staffInfo || (st.employee ? {
                  id: st.employee.id,
                  full_name: st.employee.name || st.employee.fullname || 'Chưa rõ',
                  avatar: st.employee.avatar || null,
                  position: st.employee.position || ''
                } : hydratedAssignments[0]?.hydrated_employee || null),
                completed_date: st.completed_date || st.end_date || st.due_date || null
              });
            });
          }

          hydratedAssignments.forEach((assign: any) => {
            if (Array.isArray(assign.subtasks) && assign.subtasks.length > 0) {
              assign.subtasks.forEach((st: any) => {
                const stProc = Number(st.process || st.progress || 0);
                const isChecked = Boolean(st.checked || stProc >= 100);
                let stStatusObj = st.status;
                if (isChecked) {
                  stStatusObj = { id: 4, name: 'Hoàn thành' };
                } else if (stProc > 0) {
                  stStatusObj = { id: 2, name: 'Đang thực hiện' };
                } else {
                  stStatusObj = { id: 1, name: 'Chưa thực hiện' };
                }

                extractedSubtasks.push({
                  ...st,
                  id: st.id,
                  title: st.name || st.title || 'Công việc con',
                  name: st.name || st.title || 'Công việc con',
                  checked: isChecked,
                  process: stProc,
                  progress: stProc,
                  status: stStatusObj,
                  employee: assign.hydrated_employee,
                  completed_date: st.completed_date || st.end_date || st.due_date || assign.completed_date || null,
                  ea_id: assign.id
                });
              });
            }
          });

          const finalSubtasks = extractedSubtasks;

          // Quy tắc xét duyệt công việc (dựa trên dữ liệu thực tế APEC Global API):
          // - EA.checked === true  → "Đã duyệt" (done) — CHỈ KHI SẾP TÍCH DUYỆT
          // - checked === false & t.process (task-level) >= 100 → "Chờ duyệt" (review)
          //   Ví dụ: "Tinh chỉnh web POS" (t.process=100, checked=false) → review
          // - checked === false & t.process < 100 → "Đang thực hiện" (in_progress)
          //   Ví dụ: "Tool gửi ZNS" (t.process=0, ea.process=100, subtasks 100%) → in_progress
          // - process === 0 → "Chưa làm" (todo)
          const isApprovedByBoss = ea.length > 0 && ea.every((assign: any) => assign.checked === true);
          const parentProcess = Number(t.process ?? t.progress ?? 0);
          const taskStatusId = Number(t.status?.id || t.task_status?.id || t.status);
          const statusName = String(t.status?.name || t.status || '').toLowerCase();
          const isApecDone = taskStatusId === 4 || t.status === 'done' || t.status === 'completed' || t.status === 'resolved' || t.status === 'implemented' || statusName.includes('hoàn thành') || statusName.includes('đã duyệt') || Boolean(t.is_completed);
          
          // Tính tiến độ hiển thị: lấy max giữa process cha và trung bình EA process
          let avgProgress = parentProcess;
          if (ea.length > 0) {
            const sum = ea.reduce((acc: number, cur: any) => acc + (Number(cur.process ?? cur.progress) || 0), 0);
            avgProgress = Math.max(parentProcess, Math.round(sum / ea.length));
          }
          if (finalSubtasks.length > 0) {
            const subAvg = Math.round(finalSubtasks.reduce((a: number, b: any) => a + (b.process || 0), 0) / finalSubtasks.length);
            avgProgress = Math.max(avgProgress, subAvg);
          }

          let taskStatus = 'todo';
          if (isApecDone || isApprovedByBoss) {
            taskStatus = 'done'; // Sếp đã tích checked = true HOẶC server APEC đã duyệt
          } else if (taskStatusId === 3 || statusName.includes('chờ duyệt') || statusName === 'review' || parentProcess >= 100 || avgProgress >= 100) {
            taskStatus = 'review'; // t.process (task-level) đạt 100% hoặc status = 3 nhưng sếp chưa duyệt → Chờ duyệt
          } else if (avgProgress > 0 || parentProcess > 0 || taskStatusId === 2 || statusName.includes('đang')) {
            taskStatus = 'in_progress'; // Đang thực hiện
          } else {
            taskStatus = 'todo';
          }

          const resolvedAssignees = hydratedAssignments.map((ha: any) => ha.hydrated_employee).filter(Boolean);

          const taskNode = {
            id: `apec_${t.id}`,
            raw_id: t.id,
            checklist_id: tt.id ? `apec_type_${tt.id}` : `apec_type_t_${idx}`,
            project_id: projectId,
            title: t.name || t.title,
            name: t.name || t.title,
            description: t.description || '',
            status: taskStatus,
            priority: (t.priority && t.priority.name) ? String(t.priority.name).toLowerCase() : 'medium',
            progress: avgProgress,
            target_value: Number(t.target_value || 100),
            kpi_item_id: Number(t.kpi_item?.id || t.kpi_item_id || 47),
            start_date: t.date_start || null,
            end_date: t.date_end || t.due_date || null,
            is_completed: isApecDone || isApprovedByBoss, // Hoàn thành khi server APEC đã xong hoặc sếp đã duyệt
            assignees: resolvedAssignees,
            sort_order: 0,
            employee_assignments: hydratedAssignments,
            subtasks: finalSubtasks,
            department: deptName,
            rawApecTask: t
          };

          if (!deptMap.has(deptName)) {
            deptMap.set(deptName, []);
          }
          deptMap.get(deptName)!.push(taskNode);
        });

        // Sort items inside departments to prioritize 'review' and 'in_progress'
        const getStatusWeight = (s: string) => {
          if (s === 'review') return 1;
          if (s === 'in_progress') return 2;
          if (s === 'todo') return 3;
          return 4; // done
        };

        const departments = Array.from(deptMap.entries()).map(([deptName, items]) => ({
          id: `dept_${deptName}`,
          name: deptName,
          items: items.sort((a, b) => getStatusWeight(a.status) - getStatusWeight(b.status))
        })).sort((a, b) => {
          if (a.name.includes('Chưa phân bổ')) return 1;
          if (b.name.includes('Chưa phân bổ')) return -1;
          return a.name.localeCompare(b.name);
        });

        return {
          id: tt.id ? `apec_type_${tt.id}` : `apec_type_t_${idx}`,
          name: typeName,
          title: typeName,
          raw_id: tt.id,
          project_id: projectId,
          departments: departments,
          checklist_items: departments.flatMap(d => d.items)
        };
      });

      const projectCompanyId = currentPrj?.companies?.[0]?.id || currentPrj?.company_id || 6;
      
      await Promise.all(syncPromises).catch(err => console.warn('[BoardData] Lỗi khi await syncPromises:', err));

      return {
        success: true,
        apecProjectId: resolvedApecProjectId,
        apecCompanyId: projectCompanyId,
        staff: staffList,
        taskTypes: taskTypes,
        checklists: checklists,
        timestamp: Date.now()
      };
    }, { staleTimeMs: 3000, expireTimeMs: 60000 }); // 3 seconds stale

    if (result.success && result.checklists) {
      result.checklists = result.checklists.map((cl: any) => {
        if (!isItemDeleted(cl.id, cl.name)) {
          cl.departments = cl.departments.map((d: any) => {
            d.items = d.items.filter((item: any) => !isItemDeleted(item.id, item.name || item.title));
            return d;
          }).filter((d: any) => d.items.length > 0);
          cl.checklist_items = cl.checklist_items.filter((item: any) => !isItemDeleted(item.id, item.name || item.title));
          return cl;
        }
        return null;
      }).filter(Boolean);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('BFF /board-data error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
