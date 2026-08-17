'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useOrganization } from '@/components/providers/organization-provider'

// Dynamic imports for heavy components - reduces initial bundle size
const MonitorStatsRow = dynamic(() => import('@/components/dashboard/MonitorStatsRow').then(mod => mod.MonitorStatsRow), {
  loading: () => <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6"><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div><div className="h-20 bg-slate-100 rounded-xl animate-pulse col-span-2"></div></div>
})

const MiniKanban = dynamic(() => import('@/components/dashboard/MiniKanban').then(mod => mod.MiniKanban), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const MiniGantt = dynamic(() => import('@/components/dashboard/MiniGantt').then(mod => mod.MiniGantt), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const ScheduleWidget = dynamic(() => import('@/components/dashboard/ScheduleWidget').then(mod => mod.ScheduleWidget), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const MonitoringActivity = dynamic(() => import('@/components/dashboard/MonitoringActivity').then(mod => mod.MonitoringActivity), {
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse"></div>
})

const IncidentTrendCharts = dynamic(() => import('@/components/dashboard/IncidentTrendCharts').then(mod => mod.IncidentTrendCharts), {
  ssr: false,
  loading: () => <div className="h-[380px] bg-slate-100 rounded-2xl animate-pulse col-span-3"></div>
})

const DepartmentTasksOverviewTable = dynamic(() => import('@/components/dashboard/DepartmentTasksOverviewTable').then(mod => mod.DepartmentTasksOverviewTable), {
  loading: () => <div className="h-[400px] bg-white rounded-2xl border border-slate-200 animate-pulse mb-8"></div>
})

export default function DashboardPage() {
  const router = useRouter()
  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [overviewTasks, setOverviewTasks] = useState<any[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    overdueProjects: 0,
    planningProjects: 0,
    totalIncidents: 0,
    unresolvedIncidents: 0,
    totalStaff: 0,
    totalImprovements: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    avgProgress: 0,
  })

  // Lắng nghe sự kiện refresh từ các component con
  useEffect(() => {
    const handleRefreshEvent = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('refresh-dashboard', handleRefreshEvent);
    return () => window.removeEventListener('refresh-dashboard', handleRefreshEvent);
  }, []);

  useEffect(() => {
    if (isLoadingOrg) return;

    const loadData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        if (!activeOrganization) {
          setError('Chưa có tổ chức nào được chọn. Hãy tạo hoặc tham gia một tổ chức để bắt đầu.')
          setIsLoading(false)
          return
        }

        const orgIds = [activeOrganization.id]

        // 1. Khởi tạo các promise song song cho dữ liệu độc lập
        const projectsPromise = supabase
          .from('projects')
          .select('*, departments(id, name)')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });

        const apecProjectsPromise = fetch('/api/v1/apec-global/projects')
          .then(r => r.json())
          .catch(() => ({ success: false, items: [] }));

        const incidentsPromise = supabase
          .from('incidents')
          .select('*, projects(name)')
          .or(`organization_id.in.(${orgIds.join(',')}),organization_id.is.null`)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        const staffCountPromise = supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', orgIds)
          .is('deleted_at', null);

        const improvementsCountPromise = supabase
          .from('improvements')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', orgIds);

        const departmentsPromise = supabase
          .from('departments')
          .select('*')
          .in('organization_id', orgIds)
          .is('deleted_at', null)
          .order('name');

        const apecDepartmentsPromise = fetch('/api/v1/apec-global/departments')
          .then(r => r.json())
          .catch(() => ({ success: false, items: [] }));

        const staffPromise = supabase
          .from('staff')
          .select(`
            id, full_name, email, phone, role, department_id,
            departments(id, name)
          `)
          .in('organization_id', orgIds)
          .is('deleted_at', null);

        const profilesPromise = supabase
          .from('organization_members')
          .select('user_id, profiles(id, full_name, avatar_url)')
          .in('organization_id', orgIds)
          .is('deleted_at', null);

        const liveEmpPromise = fetch('/api/v1/apec-global/employees')
          .then(r => r.json())
          .catch(() => ({ success: false, items: [] }));

        const apecTasksPromise = fetch('/api/v1/apec-global/tasks?limit=2000')
          .then(r => r.json())
          .catch(() => ({ success: false, items: [] }));

        // Đợi tất cả fetch độc lập ban đầu hoàn thành
        const [
          projectsRes,
          apecProjectsRes,
          incidentsRes,
          staffCountRes,
          improvementsCountRes,
          departmentsRes,
          apecDepartmentsRes,
          staffRes,
          profilesRes,
          liveEmpRes,
          apecTasksRes
        ] = await Promise.all([
          projectsPromise,
          apecProjectsPromise,
          incidentsPromise,
          staffCountPromise,
          improvementsCountPromise,
          departmentsPromise,
          apecDepartmentsPromise,
          staffPromise,
          profilesPromise,
          liveEmpPromise,
          apecTasksPromise
        ]);

        let rawSupabaseProjects = projectsRes.data || [];
        const incidentsData = incidentsRes.data || [];
        const totalImprovements = improvementsCountRes.count || 0;
        let departmentsData = [...(departmentsRes.data || [])];

        // Gộp phòng ban từ APEC Global nếu chưa có
        if (apecDepartmentsRes.success && Array.isArray(apecDepartmentsRes.items)) {
          const existingDeptNames = new Set(departmentsData.map(d => (d.name || '').trim().toLowerCase()));
          apecDepartmentsRes.items.forEach((apecDept: any) => {
            const dName = apecDept.name || apecDept.department_name;
            if (dName && !existingDeptNames.has(dName.trim().toLowerCase())) {
              existingDeptNames.add(dName.trim().toLowerCase());
              departmentsData.push({
                id: apecDept.id || `apec_dept_${apecDept.id}`,
                name: dName.trim(),
                description: apecDept.description || null,
                _from_apec: true,
              });
            }
          });
        }

        // Gộp dự án từ APEC Global vào danh sách dự án
        let projectsData = [...rawSupabaseProjects];
        if (apecProjectsRes.success && Array.isArray(apecProjectsRes.items)) {
          apecProjectsRes.items.forEach((apecPrj: any) => {
            const code = apecPrj.code || `P-${apecPrj.id}`;
            const existingIdx = projectsData.findIndex((p: any) =>
              (p.code && p.code.toLowerCase() === code.toLowerCase()) ||
              String(p.id) === String(apecPrj.id) ||
              (p.name && p.name.trim().toLowerCase() === (apecPrj.name || '').trim().toLowerCase())
            );
            if (existingIdx >= 0) {
              projectsData[existingIdx] = {
                ...projectsData[existingIdx],
                name: apecPrj.name || apecPrj.project_name || projectsData[existingIdx].name,
                code,
                department_name: apecPrj.department_name || apecPrj.department?.name || projectsData[existingIdx].department_name,
                department_id: apecPrj.department_id || apecPrj.department?.id || projectsData[existingIdx].department_id,
              };
            } else {
              projectsData.push({
                id: String(apecPrj.id),
                name: apecPrj.name || apecPrj.project_name || `Dự án APEC #${apecPrj.id}`,
                code,
                description: apecPrj.description || '',
                status: apecPrj.status || 'active',
                start_date: apecPrj.start_date || null,
                end_date: apecPrj.end_date || null,
                department_name: apecPrj.department_name || apecPrj.department?.name || null,
                department_id: apecPrj.department_id || apecPrj.department?.id || null,
                progress_percentage: apecPrj.process || apecPrj.progress || 0,
                _from_apec: true,
              });
            }
          });
        }

        // Bản đồ dự án để tra cứu nhanh thông tin phòng ban & tên
        const projectMap = new Map<string, any>();
        projectsData.forEach(p => {
          projectMap.set(String(p.id), p);
          if (p.code) projectMap.set(p.code.toLowerCase(), p);
          if (p.name) projectMap.set(p.name.trim().toLowerCase(), p);
        });

        // Bản đồ profiles người dùng
        const profilesMap = new Map<string, { id: string; full_name: string; avatar_url?: string }>();
        (profilesRes.data || []).forEach((m: any) => {
          const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          if (prof && prof.id) {
            profilesMap.set(String(prof.id), prof);
            if (prof.full_name) profilesMap.set(prof.full_name.trim().toLowerCase(), prof);
          }
        });

        // Bản đồ nhân sự staff
        const staffMap = new Map<string, any>();
        (staffRes.data || []).forEach((st: any) => {
          if (st.id) staffMap.set(String(st.id), st);
          if (st.full_name) staffMap.set(st.full_name.trim().toLowerCase(), st);
        });

        // Bản đồ nhân sự APEC
        const apecEmpMap = new Map<string, any>();
        if (liveEmpRes.success && Array.isArray(liveEmpRes.items)) {
          liveEmpRes.items.forEach((e: any) => {
            if (e.id) {
              apecEmpMap.set(String(e.id), e);
              apecEmpMap.set(`apec_${e.id}`, e);
              apecEmpMap.set(`apec_emp_${e.id}`, e);
            }
            if (e.fullname) apecEmpMap.set(e.fullname.trim().toLowerCase(), e);
            if (e.name) apecEmpMap.set(e.name.trim().toLowerCase(), e);
          });
        }

        // Tính toán tổng số lượng nhân sự thực tế
        const uniqueStaffSet = new Set<string>();
        if (liveEmpRes.success && Array.isArray(liveEmpRes.items)) {
          liveEmpRes.items.forEach((e: any) => {
            const key = (e.fullname || e.name || '').trim().toLowerCase() || String(e.id || '');
            if (key) uniqueStaffSet.add(key);
          });
        }
        (staffRes.data || []).forEach((st: any) => {
          const key = (st.full_name || '').trim().toLowerCase() || String(st.id || '');
          if (key) uniqueStaffSet.add(key);
        });

        const totalStaff = uniqueStaffSet.size > 0
          ? uniqueStaffSet.size
          : Math.max(
              liveEmpRes.success && Array.isArray(liveEmpRes.items) ? liveEmpRes.items.length : 0,
              (staffRes.data || []).length,
              staffCountRes.count || 0
            );

        // Bản đồ ánh xạ Nhân sự -> Đúng Phòng Ban (Staff Department Map)
        const employeeDeptMap = new Map<string, { deptName: string; deptId?: string }>();

        (staffRes.data || []).forEach((st: any) => {
          const dName = st.departments?.name;
          if (dName) {
            if (st.id) employeeDeptMap.set(String(st.id), { deptName: dName, deptId: st.department_id });
            if (st.full_name) employeeDeptMap.set(st.full_name.trim().toLowerCase(), { deptName: dName, deptId: st.department_id });
          }
        });

        if (liveEmpRes.success && Array.isArray(liveEmpRes.items)) {
          liveEmpRes.items.forEach((e: any) => {
            const dName = typeof e.department === 'object' && e.department?.name 
              ? e.department.name 
              : (typeof e.department === 'string' && e.department.trim() 
                ? e.department 
                : (e.department_name || e.dept_name || null));
            const dId = e.department?.id || e.department_id;
            
            if (dName) {
              if (e.id) {
                employeeDeptMap.set(String(e.id), { deptName: dName, deptId: String(dId || '') });
                employeeDeptMap.set(`apec_${e.id}`, { deptName: dName, deptId: String(dId || '') });
                employeeDeptMap.set(`apec_emp_${e.id}`, { deptName: dName, deptId: String(dId || '') });
              }
              if (e.fullname) employeeDeptMap.set(e.fullname.trim().toLowerCase(), { deptName: dName, deptId: String(dId || '') });
              if (e.name) employeeDeptMap.set(e.name.trim().toLowerCase(), { deptName: dName, deptId: String(dId || '') });
            }
          });
        }

        setDepartments(departmentsData)
        setIncidents(incidentsData)

        // 2. Truy vấn song song dữ liệu TASKS & CHECKLIST ITEMS từ Supabase
        const supabaseProjectIds = rawSupabaseProjects.map(p => p.id).filter(Boolean);

        let supabaseTasksPromise: any = null;
        let supabaseChecklistPromise: any = null;
        let activitiesPromise: any = null;

        if (supabaseProjectIds.length > 0) {
          // A) Lấy toàn bộ TASKS trực tiếp từ bảng tasks
          supabaseTasksPromise = supabase
            .from('tasks')
            .select(`
              id, title, description, status, priority, progress_percentage, start_date, due_date, created_at, project_id, assigned_to,
              projects(id, name, department_id, departments(id, name)),
              assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
            `)
            .in('project_id', supabaseProjectIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

          // B) Lấy toàn bộ CHECKLIST ITEMS từ bảng checklist_items
          supabaseChecklistPromise = supabase
            .from('checklist_items')
            .select(`
              id, title, description, status, is_completed, progress, end_date, start_date, due_date, priority, created_at,
              checklist_id, assigned_staff_id, assignee_ids,
              project_checklists(id, title, name, project_id, deleted_at, projects(id, name, department_id, departments(id, name))),
              assignee:staff(id, full_name, avatar_url, department_id, departments(id, name))
            `)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });

          // C) Lấy hoạt động dự án
          activitiesPromise = supabase
            .from('project_activities')
            .select('*, projects(name), user:profiles!project_activities_user_id_fkey(full_name, avatar_url)')
            .in('project_id', supabaseProjectIds)
            .order('created_at', { ascending: false })
            .limit(10);
        } else {
          // Nếu chưa có project supabase cụ thể, thử lấy chung nếu có
          supabaseTasksPromise = supabase
            .from('tasks')
            .select(`
              id, title, description, status, priority, progress_percentage, start_date, due_date, created_at, project_id, assigned_to,
              projects(id, name, department_id, departments(id, name))
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(200);

          supabaseChecklistPromise = supabase
            .from('checklist_items')
            .select(`
              id, title, description, status, is_completed, progress, end_date, start_date, due_date, priority, created_at,
              checklist_id, assigned_staff_id, assignee_ids,
              project_checklists(id, title, name, project_id, deleted_at, projects(id, name, department_id, departments(id, name))),
              assignee:staff(id, full_name, avatar_url, department_id, departments(id, name))
            `)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false })
            .limit(200);
        }

        const [tasksRes, checklistRes, activitiesResult] = await Promise.all([
          supabaseTasksPromise,
          supabaseChecklistPromise,
          activitiesPromise || Promise.resolve({ data: [] })
        ]);

        const rawTasksList = tasksRes?.data || [];
        const rawChecklistList = checklistRes?.data || [];
        const activitiesData = activitiesResult?.data || [];

        // 3. Chuẩn hóa & Xử lý tasks từ bảng `tasks` của Supabase
        const overviewFromTasksTable: any[] = rawTasksList.map((t: any) => {
          const prj = t.projects || projectMap.get(String(t.project_id));
          const strStatus = String(t.status || '').toLowerCase().trim();
          
          // Đã hoàn thành / Đã duyệt
          const isDone = t.status === 'done' || t.status === 'completed' || t.status === 'resolved' || Boolean(t.is_completed) || strStatus.includes('hoàn thành') || strStatus.includes('đã duyệt') || strStatus.includes('da duyet') || strStatus.includes('đã phê duyệt');
          
          // Chờ duyệt: Khi không ở trạng thái Hoàn thành VÀ (status là review / in_review / chờ duyệt HOẶC tiến độ 100%)
          const isReview = !isDone && (t.status === 'review' || t.status === 'in_review' || t.status === 'pending_approval' || strStatus.includes('chờ') || strStatus.includes('đợi') || strStatus.includes('pending') || Number(t.progress_percentage) >= 100);
          
          const progressVal = Number(t.progress_percentage ?? (isDone ? 100 : isReview ? 100 : (t.status === 'in_progress' ? 50 : 0)));

          // Phân giải người thực hiện
          let assigneeObj: { id?: any; full_name?: string; avatar_url?: string } | undefined = undefined;
          if (t.assigned_user) {
            assigneeObj = {
              id: t.assigned_user.id,
              full_name: t.assigned_user.full_name,
              avatar_url: t.assigned_user.avatar_url,
            };
          } else if (t.assigned_to) {
            const strAssignedTo = String(t.assigned_to);
            const prof = profilesMap.get(strAssignedTo);
            const st = staffMap.get(strAssignedTo);
            const apecEmp = apecEmpMap.get(strAssignedTo);
            if (prof) {
              assigneeObj = { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url };
            } else if (st) {
              assigneeObj = { id: st.id, full_name: st.full_name, avatar_url: st.avatar_url };
            } else if (apecEmp) {
              assigneeObj = { id: apecEmp.id, full_name: apecEmp.fullname || apecEmp.name, avatar_url: apecEmp.avatar };
            }
          }

          // Phân giải phòng ban
          let deptName = '';
          let deptId: any = undefined;

          if (assigneeObj?.id) {
            const found = employeeDeptMap.get(String(assigneeObj.id));
            if (found) {
              deptName = found.deptName;
              deptId = found.deptId;
            }
          }
          if (!deptName && assigneeObj?.full_name) {
            const found = employeeDeptMap.get(assigneeObj.full_name.trim().toLowerCase());
            if (found) {
              deptName = found.deptName;
              deptId = found.deptId;
            }
          }

          if (!deptName) {
            deptName = prj?.departments?.name || prj?.department_name;
            deptId = prj?.department_id || prj?.departments?.id;
          }

          if (!deptName) {
            deptName = 'Chung / Chưa phân loại';
          }

          // Trích xuất ngày bắt đầu và hạn chót toàn diện
          const taskStartDate = t.start_date || t.date_start || t.created_at || null;
          const taskDueDate = t.due_date || t.end_date || t.date_end || t.finish_date || t.completed_date || t.target_date || null;

            return {
              id: t.id,
              raw_id: t.id,
              title: t.title,
              project_id: prj?.id || t.project_id,
              project_name: prj?.name || 'Dự án nội bộ',
              department_id: deptId,
              department_name: deptName,
              checklist_title: (t as any).category || (t as any).type || (t as any).task_type || 'Nhiệm vụ chung',
              assignee: assigneeObj,
              start_date: taskStartDate,
              due_date: taskDueDate,
              progress: progressVal,
              status: (isDone ? 'done' : (isReview ? 'review' : (t.status === 'in_progress' ? 'in_progress' : (t.status === 'blocked' ? 'blocked' : 'todo')))) as any,
              priority: (t.priority || 'medium') as any,
              source: 'supabase' as const,
              _table: 'tasks' as const,
            };
        });

        // 4. Chuẩn hóa & Xử lý tasks từ bảng `checklist_items` của Supabase
        const overviewFromChecklistTable: any[] = rawChecklistList
          .filter((t: any) => !t.project_checklists?.deleted_at)
          .map((t: any) => {
            const prj = t.project_checklists?.projects || projectMap.get(String(t.project_checklists?.project_id || (t as any).project_id));
            const rawSt = typeof t.status === 'object' ? t.status?.name || t.status?.id : t.status;
            const taskSt = t.task_status?.id || t.task_status;
            const strStatus = String(rawSt || '').toLowerCase().trim();
            
            // Đã hoàn thành / Đã duyệt
            const isDone = Boolean(t.is_completed) || rawSt === 'done' || rawSt === 'completed' || rawSt === 'resolved' || rawSt === 4 || taskSt === 4 || strStatus.includes('hoàn thành') || strStatus.includes('đã duyệt') || strStatus.includes('da duyet') || strStatus.includes('đã phê duyệt');
            
            // Chờ duyệt: Khi không ở trạng thái Hoàn thành VÀ (status là review / in_review / chờ duyệt / statusId === 3 HOẶC tiến độ 100%)
            const isReview = !isDone && (rawSt === 'review' || rawSt === 'in_review' || rawSt === 'pending_approval' || rawSt === 3 || taskSt === 3 || strStatus.includes('chờ') || strStatus.includes('đợi') || strStatus.includes('pending') || Number(t.progress) >= 100);
            
            const progressVal = Number(t.progress ?? (isDone ? 100 : isReview ? 100 : (rawSt === 'in_progress' ? 50 : 0)));

            // Phân giải người thực hiện từ assignee / assigned_staff_id / assignee_ids
            let assigneeObj: { id?: any; full_name?: string; avatar_url?: string } | undefined = undefined;

            if (t.assignee) {
              assigneeObj = {
                id: t.assignee.id,
                full_name: t.assignee.full_name,
                avatar_url: t.assignee.avatar_url,
              };
            } else if (t.assigned_staff_id) {
              const strStaffId = String(t.assigned_staff_id);
              const st = staffMap.get(strStaffId);
              const prof = profilesMap.get(strStaffId);
              const apecEmp = apecEmpMap.get(strStaffId);
              if (st) {
                assigneeObj = { id: st.id, full_name: st.full_name, avatar_url: st.avatar_url };
              } else if (prof) {
                assigneeObj = { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url };
              } else if (apecEmp) {
                assigneeObj = { id: apecEmp.id, full_name: apecEmp.fullname || apecEmp.name, avatar_url: apecEmp.avatar };
              }
            } else if (Array.isArray(t.assignee_ids) && t.assignee_ids.length > 0) {
              const firstId = String(t.assignee_ids[0]);
              const st = staffMap.get(firstId);
              const prof = profilesMap.get(firstId);
              const apecEmp = apecEmpMap.get(firstId);
              if (st) {
                assigneeObj = { id: st.id, full_name: st.full_name, avatar_url: st.avatar_url };
              } else if (prof) {
                assigneeObj = { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url };
              } else if (apecEmp) {
                assigneeObj = { id: apecEmp.id, full_name: apecEmp.fullname || apecEmp.name, avatar_url: apecEmp.avatar };
              }
            }

            // Phân giải phòng ban
            let deptName = t.assignee?.departments?.name;
            let deptId = t.assignee?.department_id;

            if (!deptName && assigneeObj?.id) {
              const found = employeeDeptMap.get(String(assigneeObj.id));
              if (found) {
                deptName = found.deptName;
                deptId = found.deptId;
              }
            }
            if (!deptName && assigneeObj?.full_name) {
              const found = employeeDeptMap.get(assigneeObj.full_name.trim().toLowerCase());
              if (found) {
                deptName = found.deptName;
                deptId = found.deptId;
              }
            }

            if (!deptName) {
              deptName = prj?.departments?.name || prj?.department_name;
              deptId = prj?.department_id || prj?.departments?.id;
            }

            if (!deptName) {
              deptName = 'Chung / Chưa phân loại';
            }

            // Trích xuất ngày bắt đầu và hạn chót
            const ciStartDate = t.start_date || t.date_start || t.created_at || null;
            const ciDueDate = t.end_date || t.due_date || t.date_end || t.completed_date || t.finish_date || null;

            return {
              id: t.id,
              raw_id: t.id,
              title: t.title,
              project_id: prj?.id || t.project_checklists?.project_id || (t as any).project_id,
              project_name: prj?.name || 'Dự án nội bộ',
              department_id: deptId,
              department_name: deptName,
              checklist_title: t.project_checklists?.title || t.project_checklists?.name || 'Checklist dự án',
              assignee: assigneeObj,
              start_date: ciStartDate,
              due_date: ciDueDate,
              progress: progressVal,
              status: (isDone ? 'done' : (isReview ? 'review' : (rawSt === 'in_progress' ? 'in_progress' : 'todo'))) as any,
              priority: (t.priority || 'medium') as any,
              source: 'supabase' as const,
              _table: 'checklist_items' as const,
            };
          });

        // 5. Chuẩn hóa & Xử lý tasks từ APEC Global API
        let apecTasksRawItems: any[] = [];
        let overviewApecTasks: any[] = [];

        if (apecTasksRes.success && Array.isArray(apecTasksRes.items)) {
          apecTasksRawItems = apecTasksRes.items || [];
          overviewApecTasks = apecTasksRawItems.map((t: any) => {
            const ea = Array.isArray(t.employee_assignments) ? t.employee_assignments : [];
            const isApprovedByBoss = ea.length > 0 && ea.every((assign: any) => assign.checked === true);

            const parentProcess = Number(t.progress ?? t.process ?? 0);
            let eaAvg = 0;
            if (ea.length > 0) {
              const sum = ea.reduce((acc: number, cur: any) => acc + (Number(cur.process ?? cur.progress) || (cur.checked ? 100 : 0)), 0);
              eaAvg = Math.round(sum / ea.length);
            }

            const rawStatus = t.status || t.task_status;
            const statusId = typeof rawStatus === 'object' ? Number(rawStatus?.id) : (typeof t.task_status === 'object' ? Number(t.task_status?.id) : Number(rawStatus));
            const statusName = typeof rawStatus === 'object' ? String(rawStatus?.name || '').toLowerCase() : (typeof t.task_status === 'object' ? String(t.task_status?.name || '').toLowerCase() : String(rawStatus || '').toLowerCase());

            // 1. Trạng thái Hoàn thành (Done / Đã duyệt)
            const isApecDone = isApprovedByBoss || statusId === 4 || rawStatus === 'done' || rawStatus === 'completed' || rawStatus === 'resolved' || rawStatus === 'implemented' || statusName.includes('hoàn thành') || statusName.includes('đã duyệt') || statusName.includes('da duyet') || statusName.includes('đã phê duyệt') || Boolean(t.is_completed);

            // 2. Trạng thái Chờ duyệt (Review): Khi chưa duyệt VÀ (t.process >= 100 HOẶC statusId = 3 / 'Chờ duyệt')
            const isReview = !isApecDone && (statusId === 3 || rawStatus === 'review' || rawStatus === 'in_review' || rawStatus === 'pending_approval' || statusName.includes('chờ') || statusName.includes('đợi') || statusName.includes('pending') || parentProcess >= 100);

            let resolvedStatus: 'todo' | 'in_progress' | 'review' | 'done' = 'todo';
            if (isApecDone) {
              resolvedStatus = 'done';
            } else if (isReview) {
              resolvedStatus = 'review';
            } else if (parentProcess > 0 || statusId === 2 || statusName.includes('đang') || eaAvg > 0) {
              resolvedStatus = 'in_progress';
            } else {
              resolvedStatus = 'todo';
            }

            // Trích xuất thông tin người thực hiện
            let assigneeName = '';
            let assigneeId: any = undefined;
            let assigneeAvatar = undefined;
            let deptName = '';
            let deptId: any = undefined;

            if (Array.isArray(t.employee_assignments) && t.employee_assignments.length > 0) {
              const firstEa = t.employee_assignments[0];
              const emp = firstEa.employee;
              if (emp) {
                assigneeName = emp.fullname || emp.name || '';
                assigneeId = emp.id;
                assigneeAvatar = emp.avatar;
                deptName = emp.department_name || (typeof emp.department === 'object' ? emp.department?.name : (typeof emp.department === 'string' ? emp.department : ''));
                deptId = emp.department_id || emp.department?.id;
              }
            }

            if (!assigneeName && t.employee) {
              assigneeName = t.employee.fullname || t.employee.name || '';
              assigneeId = t.employee.id;
              assigneeAvatar = t.employee.avatar;
              deptName = t.employee.department_name || (typeof t.employee.department === 'object' ? t.employee.department?.name : (typeof t.employee.department === 'string' ? t.employee.department : ''));
              deptId = t.employee.department_id || t.employee.department?.id;
            }

            // Tra cứu phòng ban chuẩn theo Nhân Sự từ employeeDeptMap
            if (!deptName && assigneeId) {
              const found = employeeDeptMap.get(String(assigneeId)) || employeeDeptMap.get(`apec_${assigneeId}`) || employeeDeptMap.get(`apec_emp_${assigneeId}`);
              if (found) {
                deptName = found.deptName;
                deptId = found.deptId;
              }
            }
            if (!deptName && assigneeName) {
              const found = employeeDeptMap.get(assigneeName.trim().toLowerCase());
              if (found) {
                deptName = found.deptName;
                deptId = found.deptId;
              }
            }

            // Fallback: Tra cứu theo dự án hoặc phòng ban trên task
            if (!deptName) {
              deptName = typeof t.department === 'object' ? t.department?.name : (t.department_name || t.project?.department_name || null);
              deptId = t.department_id || t.department?.id;
            }

            const pId = t.project_id || t.project?.id;
            const prj = pId ? projectMap.get(String(pId)) : null;
            if (!deptName && prj) {
              deptName = prj.department_name || prj.departments?.name;
              deptId = prj.department_id;
            }

            if (!deptName) {
              deptName = 'Chung / Chưa phân loại';
            }

            // Trích xuất thời gian hạn chót & ngày bắt đầu đầy đủ từ mọi trường APEC
            let startDate = t.date_start || t.start_date || t.created_at || null;
            let dueDate = t.date_end || t.end_date || t.due_date || t.completed_date || t.finish_date || t.target_date || null;

            if (Array.isArray(t.employee_assignments) && t.employee_assignments.length > 0) {
              for (const ea of t.employee_assignments) {
                if (!dueDate && (ea.completed_date || ea.date_end || ea.end_date || ea.due_date)) {
                  dueDate = ea.completed_date || ea.date_end || ea.end_date || ea.due_date;
                }
                if (!startDate && (ea.date_start || ea.start_date)) {
                  startDate = ea.date_start || ea.start_date;
                }
              }
            }

            if (!dueDate && Array.isArray(t.subtasks) && t.subtasks.length > 0) {
              for (const sub of t.subtasks) {
                const subDate = sub.date_end || sub.end_date || sub.due_date || sub.completed_date;
                if (subDate) {
                  dueDate = subDate;
                  break;
                }
              }
            }

            const apecChecklistType = (typeof t.type === 'object' ? t.type?.name : t.type_name) ||
              t.type_task?.name ||
              t.checklist_title ||
              (t.is_incident ? 'SỰ CỐ & RỦI RO' : (t.is_improvement ? 'CẢI TIẾN & NÂNG CẤP' : 'NHẬT KÝ CHUYÊN MÔN'));

            return {
              id: `apec_${t.id}`,
              raw_id: t.id,
              title: t.name || t.title || 'Nhiệm vụ',
              project_id: pId,
              project_name: prj?.name || t.project?.name || t.project_name || 'Dự án APEC',
              department_id: deptId,
              department_name: deptName,
              checklist_title: apecChecklistType,
              assignee: assigneeName ? {
                id: assigneeId,
                full_name: assigneeName,
                avatar_url: assigneeAvatar
              } : undefined,
              start_date: startDate,
              due_date: dueDate,
              progress: parentProcess,
              status: resolvedStatus,
              priority: (t.priority?.name?.toLowerCase()?.includes('cao') ? 'high' : 'medium') as any,
              source: 'apec' as const,
              employee_assignments: t.employee_assignments || []
            };
          });
        }

        // 6. HỢP NHẤT TOÀN BỘ CÔNG VIỆC TỪ MỌI NGUỒN & KHỬ TRÙNG LẶP
        const seenTaskIds = new Set<string>();
        const combinedOverviewTasks: any[] = [];

        // Đưa tất cả tasks từ bảng tasks, checklist_items và apec vào
        [...overviewFromTasksTable, ...overviewFromChecklistTable, ...overviewApecTasks].forEach(t => {
          const key = `${t.source}_${t.raw_id || t.id}`;
          if (!seenTaskIds.has(key)) {
            seenTaskIds.add(key);
            combinedOverviewTasks.push(t);
          }
        });

        // 7. Cập nhật dữ liệu cho các component con
        setOverviewTasks(combinedOverviewTasks);

        // Chuẩn hóa tasksData cho MiniKanban và ScheduleWidget
        const allTasksForWidgets = combinedOverviewTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          project_id: t.project_id,
          projects: { name: t.project_name },
          assignee: t.assignee,
        }));

        setTasks(allTasksForWidgets);
        setProjects(projectsData);
        setActivities(activitiesData);

        // 8. Merge Incidents (Supabase + APEC tasks có type là SỰ CỐ & RỦI RO)
        const apecIncidentTasks = (apecTasksRawItems || []).filter((t: any) => {
          const typeName = String(t.type?.name || t.type_name || '').toUpperCase();
          return typeName.includes('SỰ CỐ') || typeName.includes('RỦI RO');
        });

        const mapApecIncidentStatus = (t: any): string => {
          const taskProc = Number(t.process ?? t.progress ?? 0);
          const statusName = String(t.status?.name || t.status || '').toLowerCase();
          const statusId = Number(t.status?.id || t.task_status?.id || t.status);
          
          if (t.is_completed || t.status === 'done' || taskProc >= 100 || statusName.includes('hoàn thành') || statusName.includes('đã duyệt') || statusId === 4) return 'resolved';
          if (t.status === 'review' || statusName.includes('chờ duyệt') || statusId === 3) return 'review';
          if (t.status === 'in_progress' || statusName.includes('đang thực hiện') || statusId === 2) return 'investigating';
          return 'new';
        };

        const existingIncidentIds = new Set([
          ...incidentsData.map((i: any) => String(i.id)),
          ...incidentsData.map((i: any) => String(i.checklist_item_id || '')).filter(Boolean)
        ]);

        const extraApecIncidents = apecIncidentTasks
          .filter((t: any) => !existingIncidentIds.has(String(t.id)))
          .map((t: any) => ({
            id: String(t.id),
            title: t.name || t.title || '',
            status: mapApecIncidentStatus(t),
            created_at: t.created_at || new Date().toISOString(),
            _from_apec: true,
          }));

        const combinedIncidents = [
          ...incidentsData.map((inc: any) => {
            let currentStatus = inc.status;
            const apecTask = (apecTasksRawItems || []).find((t: any) => 
              String(t.id) === String(inc.checklist_item_id || inc.id) ||
              `apec_${t.id}` === String(inc.checklist_item_id) ||
              (t.name && inc.title && t.name.trim().toLowerCase() === inc.title.trim().toLowerCase())
            );
            if (apecTask) {
              currentStatus = mapApecIncidentStatus(apecTask);
            }
            return { ...inc, status: currentStatus };
          }),
          ...extraApecIncidents
        ];

        setIncidents(combinedIncidents);

        // 9. Tính toán Stats Toàn Diện
        const totalInc = combinedIncidents.length;
        const unresolvedInc = combinedIncidents.filter((inc: any) =>
          inc.status !== 'resolved' && inc.status !== 'closed' && inc.status !== 'fixed'
        ).length;

        const totalTasksCount = combinedOverviewTasks.length;
        const completedTasksCount = combinedOverviewTasks.filter(t => t.status === 'done' || t.progress >= 100).length;
        const inProgressTasksCount = combinedOverviewTasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
        const todoTasksCount = combinedOverviewTasks.filter(t => t.status === 'todo' || t.status === 'blocked').length;

        // Tính overdue projects
        const now = new Date();
        const overdueProjects = projectsData.filter((p: any) => {
          if (p.status === 'overdue') return true;
          if (p.end_date && (p.status === 'active' || p.status === 'in_progress' || p.status === 'planning')) {
            return new Date(p.end_date) < now;
          }
          return false;
        }).length;

        // Tính tiến độ trung bình
        const projectsWithProgress = projectsData.filter((p: any) => Number(p.progress_percentage) > 0);
        const avgProgress = projectsWithProgress.length > 0
          ? Math.round(projectsWithProgress.reduce((sum: number, p: any) => sum + (Number(p.progress_percentage) || 0), 0) / projectsWithProgress.length)
          : (totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0);

        setStats({
          totalProjects: projectsData.length,
          activeProjects: projectsData.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length,
          completedProjects: projectsData.filter((p: any) => p.status === 'completed' || p.status === 'done').length,
          overdueProjects,
          planningProjects: projectsData.filter((p: any) => p.status === 'planning' || p.status === 'not_started').length,
          totalIncidents: totalInc,
          unresolvedIncidents: unresolvedInc,
          totalStaff,
          totalImprovements,
          totalTasks: totalTasksCount,
          completedTasks: completedTasksCount,
          inProgressTasks: inProgressTasksCount,
          todoTasks: todoTasksCount,
          avgProgress,
        });

      } catch (err: any) {
        console.error('Error loading dashboard:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, activeOrganization, isLoadingOrg, refreshTrigger])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải dữ liệu thực...</div>
        </div>
      </div>
    )
  }

  if (error && projects.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 max-w-2xl mx-auto mt-10 text-center">
        <h2 className="text-2xl font-bold text-blue-900 mb-3">Chào mừng đến PM Monitor!</h2>
        <p className="text-blue-800 mb-6 text-lg">{error}</p>
        <button
          onClick={() => router.push('/dashboard/organizations')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-blue-200 transition-all"
        >
          Tạo Tổ chức đầu tiên
        </button>
      </div>
    )
  }

  return (
    <div className="pb-10 font-sans">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan giám sát</h1>
        <p className="text-sm text-slate-500">Theo dõi tiến độ dự án, sự cố phát sinh và tình trạng xử lý dựa trên dữ liệu thời gian thực.</p>
      </div>

      {/* VỊ TRÍ 1: HÀNG CHỈ SỐ TỔNG QUAN */}
      <MonitorStatsRow stats={stats} />

      {/* VỊ TRÍ 2: BẢNG THỐNG KÊ & DUYỆT CÔNG VIỆC TOÀN BỘ DỰ ÁN THEO PHÒNG BAN */}
      <DepartmentTasksOverviewTable
        initialTasks={overviewTasks}
        projects={projects}
        departments={departments}
        onRefresh={() => {
          setIsLoading(true)
          setRefreshTrigger(prev => prev + 1)
        }}
        isLoading={isLoading}
      />

      {/* HÀNG TIẾN ĐỘ & CÔNG VIỆC (4 CỘT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <MiniKanban tasks={tasks} />
        <MiniGantt projects={projects} />
        <ScheduleWidget tasks={tasks} />
        <MonitoringActivity activities={activities} />
      </div>

      {/* HÀNG SỰ CỐ & RỦI RO (3 CỘT) */}
      <IncidentTrendCharts incidents={incidents} />

    </div>
  )
}