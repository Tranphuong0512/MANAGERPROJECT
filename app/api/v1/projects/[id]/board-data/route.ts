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
    
    // Auth Check
    if (!authorized && process.env.NODE_ENV === 'production') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams?.id;
    
    // In-memory cache key
    const cacheKey = `board-data:${projectId}`;
    
    const result = await getCachedOrFetch(cacheKey, async () => {
      // 1. Fetch Local Project Info
      let localPrjCode = '';
      let localPrjName = '';
      
      if (supabase) {
        const { data: localPrjInfo } = await supabase
          .from('projects')
          .select('id, code, name')
          .eq('id', projectId)
          .maybeSingle();
        
        localPrjCode = localPrjInfo?.code?.toLowerCase() || '';
        localPrjName = localPrjInfo?.name?.toLowerCase().trim() || '';
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

      // 6. Build Task Types / Checklists Tree
      const abandonedTypes = ['HẰNG NGÀY', 'CHUNG', 'CÁ NHÂN'];
      const taskTypes = (apecTypesRes.items || []).filter((tt: any) => 
        !abandonedTypes.includes((tt.name || tt.title || '').trim().toUpperCase()) &&
        !isItemDeleted(tt.id, tt.name || tt.title)
      );

      if (!taskTypes.some((tt: any) => (tt.name || tt.title || '').trim().toUpperCase() === 'NHẬT KÝ CHUYÊN MÔN')) {
        taskTypes.push({ id: 1, name: 'NHẬT KÝ CHUYÊN MÔN' });
      }

      const checklists = taskTypes.map((tt: any, idx: number) => {
        const typeName = tt.name || tt.title || `Loại ${tt.id}`;
        const tasksForThisType = projectTasks.filter((t: any) => {
          const tTypeName = (t.type?.name || t.type_name || 'NHẬT KÝ CHUYÊN MÔN').toUpperCase().trim();
          const targetName = typeName.toUpperCase().trim();
          if (targetName === 'NHẬT KÝ CHUYÊN MÔN' && abandonedTypes.includes(tTypeName)) return true;
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
          if (isApprovedByBoss) {
            taskStatus = 'done'; // Sếp đã tích checked = true → Đã duyệt
          } else if (parentProcess >= 100) {
            taskStatus = 'review'; // t.process (task-level) đạt 100% nhưng sếp chưa duyệt → Chờ duyệt
          } else if (avgProgress > 0 || parentProcess > 0) {
            taskStatus = 'in_progress'; // Đang thực hiện (kể cả EA/subtasks 100% nhưng t.process < 100)
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
            start_date: t.date_start || null,
            end_date: t.date_end || t.due_date || null,
            is_completed: isApprovedByBoss, // CHỈ hoàn thành khi sếp đã duyệt (checked = true)
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

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('BFF /board-data error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
