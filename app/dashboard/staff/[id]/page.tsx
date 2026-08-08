'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'
import { ChevronLeft, FolderKanban, AlertTriangle, Lightbulb, Phone, Mail, CheckCircle2, ChevronRight, ChevronDown, CornerDownRight, Building2, Briefcase, ExternalLink, Filter } from 'lucide-react'
import Link from 'next/link'

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeOrganization } = useOrganization()
  const staffId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'incidents' | 'improvements'>('tasks')
  
  const [staffProfile, setStaffProfile] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [improvements, setImprovements] = useState<any[]>([])

  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({})
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({})
  const [expandedParentTasks, setExpandedParentTasks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!activeOrganization || !staffId) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const orgId = activeOrganization.id

        // 0. Try fetching from Apec Global live employees API first
        let profileData: any = null;
        try {
          const empRes = await fetch('/api/v1/apec-global/employees').then(r => r.json()).catch(() => null);
          if (empRes && empRes.success && empRes.items) {
            const rawId = String(staffId).replace('apec_', '');
            const foundEmp = empRes.items.find((e: any) => 
              String(e.id) === rawId || `apec_${e.id}` === String(staffId) || String(e.id) === String(staffId)
            );
            if (foundEmp) {
              const deptName = typeof foundEmp.department === 'object' && foundEmp.department?.name ? foundEmp.department.name : (typeof foundEmp.department === 'string' && foundEmp.department.trim() ? foundEmp.department : (foundEmp.department_name || foundEmp.dept_name || foundEmp.company_name || 'APEC GLOBAL'));
              profileData = {
                id: staffId,
                org_member_id: staffId,
                full_name: foundEmp.fullname || foundEmp.name || 'Nhân sự APEC',
                departments: [deptName],
                role: foundEmp.position || foundEmp.job_title || 'Thành viên (API)',
                email: foundEmp.email || 'Đang cập nhật',
                phone: foundEmp.phone || 'Đang cập nhật',
                avatar: foundEmp.avatar || null,
                isApec: true
              };
            }
          }
        } catch (e) {
          console.warn('Could not fetch Apec Global employee:', e);
        }

        if (!profileData) {
          // 1. Try fetching from staff table (APEC GLOBAL employees)
          const { data: staffRow } = await supabase
            .from('staff')
            .select(`
              id, full_name, email, phone, role, department_id,
              departments(name)
            `)
            .eq('organization_id', orgId)
            .eq('id', staffId)
            .is('deleted_at', null)
            .maybeSingle();

          if (staffRow) {
            profileData = {
              id: staffId,
              org_member_id: staffRow.id,
              full_name: staffRow.full_name || 'Chưa rõ',
              departments: (staffRow.departments as any)?.name ? [(staffRow.departments as any).name] : (Array.isArray(staffRow.departments) && (staffRow.departments as any)[0]?.name ? [(staffRow.departments as any)[0].name] : []),
              role: staffRow.role || 'Thành viên',
              email: staffRow.email || 'Đang cập nhật',
              phone: staffRow.phone || 'Đang cập nhật',
            };
          } else {
            // Fallback to organization_members
            const { data: memberData, error } = await supabase
              .from('organization_members')
              .select(`
                id, job_title,
                member_departments(
                  departments(name)
                ),
                profiles(full_name, avatar_url, phone)
              `)
              .eq('organization_id', orgId)
              .eq('user_id', staffId)
              .is('deleted_at', null)
              .maybeSingle();

            if (!memberData) {
              setIsLoading(false);
              return;
            }
            const data = memberData as any;
            const deptNames = data.member_departments?.map((md: any) => md.departments?.name).filter(Boolean) || [];
            profileData = {
              id: staffId,
              org_member_id: data.id,
              full_name: Array.isArray(data.profiles) ? data.profiles[0]?.full_name : data.profiles?.full_name || 'Chưa rõ',
              departments: deptNames,
              role: data.job_title || '-',
              email: 'Đang cập nhật',
              phone: Array.isArray(data.profiles) ? data.profiles[0]?.phone : data.profiles?.phone || 'Đang cập nhật',
            };
          }
        }

        setStaffProfile(profileData);

        // Fetch Tasks from APEC GLOBAL, checklist_items, tasks table, and all projects for mapping
        const [checklistRes, tasksRes, apecTasksRes, allProjectsRes] = await Promise.all([
          supabase
            .from('checklist_items')
            .select(`
              id, title, status, is_completed, end_date, priority, progress,
              project_checklists!inner(
                title, project_id,
                projects!inner(name, organization_id)
              )
            `)
            .or(`assigned_staff_id.eq.${staffId},assignee_ids.cs.{${staffId}}`)
            .eq('project_checklists.projects.organization_id', orgId)
            .is('deleted_at', null)
            .is('project_checklists.deleted_at', null)
            .is('project_checklists.projects.deleted_at', null),
          supabase
            .from('tasks')
            .select(`
              id, title, status, due_date, priority, progress_percentage, project_id,
              projects!inner(name, organization_id)
            `)
            .eq('assigned_to', staffId)
            .eq('projects.organization_id', orgId)
            .is('deleted_at', null),
          fetch('/api/v1/apec-global/tasks').then(r => r.json()).catch(() => ({ success: false, items: [] })),
          supabase.from('projects').select('id, code, name').eq('organization_id', orgId).is('deleted_at', null)
        ]);

        const projectMapByCode = new Map<string, string>();
        const projectMapByName = new Map<string, string>();
        (allProjectsRes.data || []).forEach((p: any) => {
          if (p.code) projectMapByCode.set(p.code.toLowerCase().trim(), p.id);
          if (p.name) projectMapByName.set(p.name.toLowerCase().trim(), p.id);
        });

        const clTasks = (checklistRes.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          is_completed: t.is_completed,
          end_date: t.end_date,
          priority: t.priority,
          progress: t.progress || 0,
          checklist_title: t.project_checklists?.title || 'Checklist',
          checklist_type: t.project_checklists?.title || 'Checklist',
          project_id: t.project_checklists?.project_id,
          project_name: t.project_checklists?.projects?.name || 'Dự án',
          subtasks: []
        }));

        const mainTasks = (tasksRes.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          is_completed: t.status === 'done' || t.status === 'completed' || Number(t.progress_percentage) >= 100,
          end_date: t.due_date,
          priority: t.priority,
          progress: t.progress_percentage || 0,
          checklist_title: 'NHẬT KÝ CHUYÊN MÔN',
          checklist_type: 'NHẬT KÝ CHUYÊN MÔN',
          project_id: t.project_id,
          project_name: t.projects?.name || 'Dự án',
          subtasks: []
        }));

        const rawId = String(staffId).replace('apec_', '');
        const sName = (profileData?.full_name || '').trim().toLowerCase();
        
        const apecTasksList: any[] = [];
        (apecTasksRes.items || []).forEach((t: any) => {
          let tPrjIdStr = String(t.project?.id || '').toLowerCase();
          let localProjectId = tPrjIdStr ? projectMapByCode.get(`p-${tPrjIdStr}`) : null;
          if (!localProjectId && t.project?.name) {
             localProjectId = projectMapByName.get(t.project.name.toLowerCase().trim());
          }
          if (!localProjectId) localProjectId = projectMapByCode.get('p-62'); // Default ApecGlobal

          if (Array.isArray(t.employee_assignments)) {
             const userEAs = t.employee_assignments.filter((ea: any) => {
                const eaId = ea.employee?.id !== undefined ? String(ea.employee.id) : '';
                const eaName = (ea.employee?.name || ea.employee?.fullname || '').trim().toLowerCase();
                return eaId === rawId || eaId === String(staffId) || (sName && eaName === sName);
             });

             if (userEAs.length > 0) {
                const firstEa = userEAs[0];
                
                // Quy tắc 1: trường "checked" trong employee_assignments đại diện cho việc "Đã duyệt"
                const isApprovedByBoss = userEAs.every((ea: any) => ea.checked === true);
                
                // Tiến độ task-level (từ APEC Global API field t.process)
                const taskLevelProcess = Number(t.process ?? t.progress ?? 0);
                // Tiến độ EA-level (trung bình process của nhân viên)
                const eaProgress = Math.round(
                  userEAs.reduce((acc: number, ea: any) => acc + (Number(ea.process || ea.progress) || 0), 0) / userEAs.length
                );

                const subtasks: any[] = [];
                userEAs.forEach((ea: any) => {
                  if (Array.isArray(ea.subtasks) && ea.subtasks.length > 0) {
                    ea.subtasks.forEach((st: any) => {
                       const subProc = Number(st.process || st.progress || 0);
                       const isSubChecked = Boolean(st.checked);
                       let subStatusObj = st.status;
                       if (isSubChecked) {
                         subStatusObj = { id: 4, name: 'Hoàn thành' };
                       } else if (subProc > 0) {
                         subStatusObj = { id: 2, name: 'Đang thực hiện' };
                       } else {
                         subStatusObj = { id: 1, name: 'Chưa thực hiện' };
                       }

                       subtasks.push({
                         id: st.id,
                         title: st.name || st.title || 'Công việc con',
                         status: subStatusObj,
                         process: subProc,
                         checked: isSubChecked,
                         ea_id: ea.id
                       });
                    });
                  }
                });

                const subtaskAvgProgress = subtasks.length > 0
                  ? Math.round(subtasks.reduce((acc, st) => acc + st.process, 0) / subtasks.length)
                  : 0;

                // Tiến độ hiển thị: lấy max để hiển thị trên thanh progress
                const progressVal = Math.max(taskLevelProcess, eaProgress, subtaskAvgProgress);

                const abandonedTypes = ['HẰNG NGÀY', 'CHUNG', 'CÁ NHÂN'];
                let checklistType = (typeof t.type === 'object' ? t.type?.name : t.type_name) || 'NHẬT KÝ CHUYÊN MÔN';
                if (abandonedTypes.includes(checklistType.trim().toUpperCase())) {
                  checklistType = 'NHẬT KÝ CHUYÊN MÔN';
                }
                const parentTitle = t.title || t.name || 'Công việc Apec Global';

                // BỘ QUY TẮC HIỂN THỊ TRẠNG THÁI & XÉT DUYỆT CÔNG VIỆC:
                // 1. checked === true (trong mọi EA) → "Đã duyệt" ('done') — CHỈ khi sếp tích duyệt
                // 2. checked === false & t.process (task-level) >= 100 → "Chờ duyệt" ('review')
                //    Ví dụ: "Tinh chỉnh web POS" (t.process=100, checked=false) → review
                // 3. checked === false & t.process < 100 → "Đang thực hiện" ('in_progress')
                //    Ví dụ: "Tool gửi ZNS" (t.process=0, ea.process=100, subtasks 100%) → in_progress
                // 4. Chưa có tiến độ → "Chưa làm" ('todo')
                let resolvedStatus = 'todo';
                if (isApprovedByBoss) {
                  resolvedStatus = 'done'; // Sếp đã tích checked = true → Đã duyệt
                } else if (taskLevelProcess >= 100) {
                  resolvedStatus = 'review'; // t.process đạt 100% nhưng checked = false → Chờ duyệt
                } else if (progressVal > 0 || eaProgress > 0) {
                  resolvedStatus = 'in_progress'; // Đang thực hiện (kể cả EA/subtasks 100% nhưng t.process < 100)
                } else {
                  resolvedStatus = 'todo';
                }

                apecTasksList.push({
                  id: String(t.id),
                  title: parentTitle,
                  status: resolvedStatus,
                  is_completed: isApprovedByBoss,
                  end_date: t.date_end || t.end_date || t.due_date || null,
                  priority: t.priority || 'medium',
                  progress: progressVal,
                  project_id: localProjectId || 'apec',
                  project_name: t.project?.name || t.project_name || 'Dự án Apec Global',
                  checklist_type: checklistType,
                  checklist_title: checklistType,
                  subtasks: subtasks,
                  ea_id: firstEa.id,
                  isApec: true
                });
             }
          }
        });

        setTasks([...apecTasksList, ...clTasks, ...mainTasks]);

        // Fetch Incidents
        const { data: incidentsData } = await supabase
          .from('incidents')
          .select('id, title, status, severity, created_at, project_id, projects(name), reported_by, assigned_to')
          .or(`reported_by.eq.${staffId},assigned_to.eq.${staffId}`)
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          
        if (incidentsData) setIncidents(incidentsData)

        // Fetch Improvements
        const { data: improvementsData } = await supabase
          .from('improvements')
          .select('id, title, status, created_at, project_id, projects(name)')
          .eq('reporter_id', staffId)
          .eq('organization_id', orgId)
          
        if (improvementsData) setImprovements(improvementsData)

      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [staffId, activeOrganization])

  const handleTaskStatusToggle = async (task: any) => {
    let newStatus = 'in_progress'
    let isCompleted = false
    let newProgress = task.progress

    if (task.status === 'todo' || !task.status) {
      newStatus = 'in_progress'
      newProgress = 50
    } else if (task.status === 'in_progress') {
      newStatus = 'review'
      newProgress = 80
    } else if (task.status === 'review') {
      newStatus = 'done'
      isCompleted = true
      newProgress = 100
    } else if (task.status === 'done' || task.is_completed) {
      newStatus = 'todo'
      isCompleted = false
      newProgress = 0
    }

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, is_completed: isCompleted, progress: newProgress } : t))

    // DB update
    try {
      if (task.isApec) {
        await fetch('/api/v1/apec-global/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, status: newStatus, progress: newProgress, process: newProgress }),
        });
      } else {
        await supabase
          .from('checklist_items')
          .update({ status: newStatus, is_completed: isCompleted, progress: newProgress })
          .eq('id', task.id)
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái', err)
      // Optionally revert if failed
    }
  }

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: prev[type] === undefined ? false : !prev[type]
    }));
  };
  const isTypeExpanded = (type: string) => expandedTypes[type] !== false;

  const toggleParentTask = (taskId: string, hasSubtasks: boolean) => {
    if (!hasSubtasks) return;
    setExpandedParentTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  const isParentExpanded = (taskId: string) => Boolean(expandedParentTasks[taskId]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress_review' | 'in_progress' | 'review' | 'todo' | 'done'>('all');

  const groupedTasks = useMemo(() => {
    const map = new Map<string, Map<string, any[]>>();

    const filtered = tasks.filter(t => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'in_progress_review') return t.status === 'in_progress' || t.status === 'review';
      if (statusFilter === 'in_progress') return t.status === 'in_progress';
      if (statusFilter === 'review') return t.status === 'review';
      if (statusFilter === 'todo') return t.status === 'todo';
      if (statusFilter === 'done') return t.status === 'done' || t.is_completed;
      return true;
    });

    filtered.forEach(t => {
      const typeKey = t.checklist_type || t.checklist_title || 'NHẬT KÝ CHUYÊN MÔN';
      // Mặc định lấy phòng ban của nhân sự đang xem nếu có, hoặc từ dự án
      const deptKey = (staffProfile?.departments && staffProfile.departments.length > 0) 
        ? staffProfile.departments[0] 
        : 'Chưa phân bổ';

      if (!map.has(typeKey)) map.set(typeKey, new Map<string, any[]>());
      if (!map.get(typeKey)!.has(deptKey)) map.get(typeKey)!.set(deptKey, []);
      
      map.get(typeKey)!.get(deptKey)!.push(t);
    });

    return Array.from(map.entries()).map(([type, deptMap]) => ({
      type,
      departments: Array.from(deptMap.entries()).map(([deptName, items]) => {
        // ALWAYS SORT: 'review' (1) and 'in_progress' (2) to the TOP!
        const sortedItems = [...items].sort((a, b) => {
          const getRank = (st: string, isComp?: boolean) => {
            if (st === 'review') return 1;
            if (st === 'in_progress') return 2;
            if (st === 'todo') return 3;
            if (st === 'done' || isComp) return 4;
            return 3;
          };
          return getRank(a.status, a.is_completed) - getRank(b.status, b.is_completed);
        });

        return {
          deptName,
          items: sortedItems
        };
      })
    }));
  }, [tasks, staffProfile, statusFilter]);

  const staffStats = useMemo(() => {
    let parentCount = tasks.length;
    let subtaskCount = 0;
    let parentCompleted = 0;
    let subtaskCompleted = 0;
    let riskCount = 0;
    let improvementCount = 0;
    let overdueCount = 0;
    const now = new Date();

    tasks.forEach(t => {
      const isDone = t.status === 'done' || t.is_completed;
      if (isDone) parentCompleted++;

      if (t.end_date && new Date(t.end_date) < now && !isDone) {
        overdueCount++;
      }

      const cType = (t.checklist_type || t.checklist_title || '').toLowerCase();
      if (cType.includes('rủi ro') || cType.includes('sự cố')) {
        riskCount++;
      }
      if (cType.includes('cải tiến') || cType.includes('nâng cấp') || cType.includes('sáng kiến')) {
        improvementCount++;
      }

      if (Array.isArray(t.subtasks)) {
        subtaskCount += t.subtasks.length;
        t.subtasks.forEach((st: any) => {
          if (st.checked || st.status?.name === 'Hoàn thành' || Number(st.process) >= 100) {
            subtaskCompleted++;
          }
        });
      }
    });

    riskCount += incidents.length;
    improvementCount += improvements.length;

    return {
      parentCount,
      parentCompleted,
      subtaskCount,
      subtaskCompleted,
      riskCount,
      improvementCount,
      overdueCount
    };
  }, [tasks, incidents, improvements]);

  const handleSubtaskToggle = async (task: any, subtask: any, e: any) => {
    e.stopPropagation();
    const newChecked = !subtask.checked;
    const newProgress = newChecked ? 100 : 0;

    setTasks(prev => prev.map(t => {
      if (t.id === task.id && t.subtasks) {
        return {
          ...t,
          subtasks: t.subtasks.map((st: any) => st.id === subtask.id ? {
            ...st,
            checked: newChecked,
            process: newProgress,
            status: { name: newChecked ? 'Hoàn thành' : 'Đang thực hiện' }
          } : st)
        };
      }
      return t;
    }));

    try {
      if (task.ea_id) {
        await fetch('/api/v1/apec-global/assignments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: task.ea_id,
            checked: newChecked,
            process: newProgress,
            progress: newProgress,
            status: newChecked ? { name: 'Hoàn thành' } : { name: 'Đang thực hiện' }
          }),
        });
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật subtask:', err);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải hồ sơ nhân sự...</div>
        </div>
      </div>
    )
  }

  if (!staffProfile) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy nhân sự</h2>
        <button onClick={() => router.push('/dashboard/staff')} className="mt-4 text-blue-600 hover:underline">
          Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <div className="pb-10 font-sans max-w-[1200px] mx-auto">
      <div className="mb-6">
        <button 
          onClick={() => router.push('/dashboard/staff')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Danh sách nhân sự
        </button>
      </div>

      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-8 items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -z-0"></div>
        
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-4xl md:text-5xl shadow-lg border-4 border-white flex-shrink-0 z-10">
          {staffProfile.full_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 z-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{staffProfile.full_name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 font-medium mb-4">
            <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> {staffProfile.role}</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" /> 
              {staffProfile.departments.length > 0 ? staffProfile.departments.join(', ') : 'Chưa phân phòng ban'}
            </span>
          </div>
          
          <div className="flex gap-4">
            <a href={`tel:${staffProfile.phone}`} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-slate-200">
              <Phone className="w-4 h-4 text-green-600" /> {staffProfile.phone}
            </a>
            <a href={`mailto:${staffProfile.email}`} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-slate-200">
              <Mail className="w-4 h-4 text-blue-600" /> {staffProfile.email}
            </a>
          </div>
        </div>

        {/* OVERALL STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:w-auto w-full z-10">
          <div className="bg-blue-50/70 rounded-2xl p-3.5 text-center border border-blue-100 min-w-[105px]">
            <div className="text-2xl font-black text-blue-600 mb-0.5">{staffStats.parentCount}</div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Công việc cha</div>
            <div className="text-[10px] font-semibold text-blue-600 mt-0.5">Xong {staffStats.parentCompleted}</div>
          </div>
          <div className="bg-indigo-50/70 rounded-2xl p-3.5 text-center border border-indigo-100 min-w-[105px]">
            <div className="text-2xl font-black text-indigo-600 mb-0.5">{staffStats.subtaskCount}</div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Công việc con</div>
            <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">Xong {staffStats.subtaskCompleted}</div>
          </div>
          <div className="bg-rose-50/70 rounded-2xl p-3.5 text-center border border-rose-100 min-w-[105px]">
            <div className="text-2xl font-black text-rose-600 mb-0.5">{staffStats.riskCount}</div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Rủi ro & Sự cố</div>
            <div className="text-[10px] font-semibold text-rose-600 mt-0.5">Sự cố & rủi ro</div>
          </div>
          <div className="bg-amber-50/70 rounded-2xl p-3.5 text-center border border-amber-100 min-w-[105px]">
            <div className="text-2xl font-black text-amber-600 mb-0.5">{staffStats.improvementCount}</div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Cải tiến</div>
            <div className="text-[10px] font-semibold text-amber-600 mt-0.5">Sáng kiến</div>
          </div>
          <div className="bg-red-50/80 rounded-2xl p-3.5 text-center border border-red-200 min-w-[105px] col-span-2 sm:col-span-1">
            <div className="text-2xl font-black text-red-600 mb-0.5 flex items-center justify-center gap-1">
              {staffStats.overdueCount > 0 && <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />}
              {staffStats.overdueCount}
            </div>
            <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Trễ hạn</div>
            <div className="text-[10px] font-semibold text-red-600 mt-0.5">Cần xử lý ngay</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'tasks' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <FolderKanban className="w-4 h-4" /> Công việc dự án
        </button>
        <button 
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'incidents' ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <AlertTriangle className="w-4 h-4" /> Lịch sử Sự cố
        </button>
        <button 
          onClick={() => setActiveTab('improvements')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'improvements' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Lightbulb className="w-4 h-4" /> Sáng kiến & Cải tiến
        </button>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[400px]">
        
        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div>
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Danh sách Công việc</h3>
                <p className="text-sm text-slate-500">Các hạng mục công việc được giao trên mọi dự án. Click icon để đổi trạng thái.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-bold">
                  Cha: {staffStats.parentCount}
                </span>
                <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-xs font-bold">
                  Con: {staffStats.subtaskCount}
                </span>
                <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-bold">
                  Rủi ro: {staffStats.riskCount}
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-bold">
                  Cải tiến: {staffStats.improvementCount}
                </span>
                {staffStats.overdueCount > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-red-100 text-red-800 border border-red-300 text-xs font-extrabold flex items-center gap-1 shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Trễ hạn: {staffStats.overdueCount}
                  </span>
                )}
              </div>
            </div>

            {/* BỘ LỌC TRẠNG THÁI (STATUS FILTER BAR) */}
            <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Lọc trạng thái:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress_review')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'in_progress_review'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                🔥 Đang làm & Chờ duyệt (Ưu tiên)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                Đang xử lý
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('review')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'review'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('todo')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'todo'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Chưa làm
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('done')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'done'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Hoàn thành
              </button>
            </div>
            <div className="p-4">
              {groupedTasks.length === 0 ? (
                <div className="p-10 text-center text-slate-500 font-medium">Chưa có công việc nào được giao.</div>
              ) : (
                <div className="space-y-3">
                  {groupedTasks.map(group => (
                    <div key={group.type} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      {/* LEVEL 1: CHECKLIST TYPE HEADER */}
                      {(() => {
                        const allGroupItems = group.departments.flatMap((d: any) => d.items);
                        const groupSubtasksCount = allGroupItems.reduce((acc: number, t: any) => acc + (Array.isArray(t.subtasks) ? t.subtasks.length : 0), 0);
                        const groupOverdueCount = allGroupItems.filter((t: any) => t.end_date && new Date(t.end_date) < new Date() && t.status !== 'done' && !t.is_completed).length;
                        return (
                          <div 
                            onClick={() => toggleType(group.type)}
                            className="flex items-center justify-between px-5 py-3.5 bg-slate-50/90 hover:bg-slate-100/90 cursor-pointer transition-all select-none border-b border-slate-200/60"
                          >
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
                                <FolderKanban className="w-4 h-4" />
                              </div>
                              <span className="font-extrabold text-slate-800 text-base tracking-tight mr-1">{group.type}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-bold">
                                {allGroupItems.length} công việc cha
                              </span>
                              {groupSubtasksCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-xs font-bold">
                                  {groupSubtasksCount} công việc con
                                </span>
                              )}
                              {groupOverdueCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-extrabold flex items-center gap-1 shadow-2xs">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  {groupOverdueCount} trễ hạn
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                              {isTypeExpanded(group.type) ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                          </div>
                        );
                      })()}

                      {/* LEVEL 2: DEPARTMENT LIST & PARENT TASKS */}
                      {isTypeExpanded(group.type) && (
                        <div className="p-2 space-y-3 bg-slate-50/30">
                          {group.departments.map((dept: any) => {
                            const isDeptExpanded = expandedDepartments[`${group.type}_${dept.deptName}`] ?? false;
                            return (
                              <div key={dept.deptName} className="border border-slate-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                {/* Department Header */}
                                <div 
                                  onClick={() => setExpandedDepartments(prev => ({ ...prev, [`${group.type}_${dept.deptName}`]: !isDeptExpanded }))}
                                  className="bg-slate-100/80 hover:bg-slate-200/80 px-4 py-2 border-b border-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                  <span className="text-sm font-bold text-slate-700">🏢 {dept.deptName}</span>
                                  <span className="text-xs font-semibold bg-white text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                                    {dept.items.length}
                                  </span>
                                </div>
                                
                                {isDeptExpanded && (
                                  <div className="p-1.5 space-y-1.5 border-t-0 border-slate-200 rounded-b-xl overflow-hidden">
                                    {dept.items.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic text-center py-2">Không có công việc</div>
                                    ) : (
                                      dept.items.map((task: any) => {
                                        const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
                                        const completedSubtasksCount = hasSubtasks 
                                          ? task.subtasks.filter((st: any) => st.checked || Number(st.process) >= 100 || st.status?.name === 'Hoàn thành').length
                                          : 0;

                            return (
                              <div 
                                key={task.id} 
                                className="flex flex-col border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-all bg-white"
                              >
                                <div 
                                  onClick={() => toggleParentTask(task.id, hasSubtasks)}
                                  className={`flex items-center justify-between p-3.5 transition-colors ${
                                    hasSubtasks ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                    {/* Interactive Status Toggle */}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTaskStatusToggle(task);
                                      }} 
                                      className="flex-shrink-0"
                                      title="Click để chuyển: Chưa làm -> Đang làm -> Hoàn thành"
                                    >
                                      {(() => {
                                        if (task.status === 'done' || task.is_completed) {
                                          return (
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                                              <CheckCircle2 className="w-4 h-4 text-white" />
                                            </div>
                                          );
                                        }
                                        if (task.status === 'in_progress') {
                                          return (
                                            <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                                              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                            </div>
                                          );
                                        }
                                        if (task.status === 'review') {
                                          return (
                                            <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
                                              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="w-6 h-6 rounded-lg border-2 border-slate-200 hover:border-blue-400 flex items-center justify-center transition-colors"></div>
                                        );
                                      })()}
                                    </button>

                                    <div className="flex flex-col min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm font-bold truncate ${task.status === 'done' || task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                          {task.title}
                                        </span>
                                        {hasSubtasks ? (
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all border ${
                                            isParentExpanded(task.id) 
                                              ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }`}>
                                            {isParentExpanded(task.id) ? <ChevronDown className="w-3 h-3 text-blue-600" /> : <ChevronRight className="w-3 h-3 text-blue-600" />}
                                            <span>{completedSubtasksCount}/{task.subtasks.length} công việc con</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200/80 select-none" title="Hiện tại công việc này chưa có công việc con">
                                            Hiện tại chưa có công việc con
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <Link
                                          href={`/dashboard/projects/${task.project_id}?taskId=${task.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/80 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                          title="Bấm để tới đúng dự án và hiển thị công việc này"
                                        >
                                          <span>{task.project_name}</span>
                                          <ExternalLink className="w-3 h-3 text-blue-500" />
                                        </Link>
                                        • Hạn chót: <span className={`font-medium ${task.end_date && new Date(task.end_date) < new Date() && task.status !== 'done' && !task.is_completed ? 'text-rose-600 font-bold' : ''}`}>
                                          {task.end_date ? new Date(task.end_date).toLocaleDateString('vi-VN') : 'Không có'}
                                        </span>
                                        {task.end_date && new Date(task.end_date) < new Date() && task.status !== 'done' && !task.is_completed && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300">
                                            <AlertTriangle className="w-2.5 h-2.5" />
                                            Trễ hạn
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6 ml-4 shrink-0">
                                    <div className="text-right hidden md:block">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tiến độ</div>
                                      <div className="text-sm font-bold text-slate-700">{task.progress || 0}%</div>
                                    </div>
                                    <Link 
                                      href={`/dashboard/projects/${task.project_id}?taskId=${task.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors shadow-2xs"
                                      title="Bấm để tới đúng dự án và hiển thị công việc này"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </Link>
                                  </div>
                                </div>

                                {/* LEVEL 3: SUBTASKS DROPDOWN */}
                                {isParentExpanded(task.id) && hasSubtasks && (
                                  <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-3 space-y-2">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
                                        Danh sách Công việc con ({task.subtasks.length} nhiệm vụ)
                                      </span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {task.subtasks.map((sub: any, sIdx: number) => (
                                        <div 
                                          key={sub.id || sIdx}
                                          className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-all"
                                        >
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <span className="text-xs font-bold text-slate-400 w-6 shrink-0">#{sIdx + 1}</span>
                                            <input
                                              type="checkbox"
                                              checked={sub.checked}
                                              onChange={(e) => handleSubtaskToggle(task, sub, e)}
                                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                              title="Hoàn thành công việc con"
                                            />
                                            <button
                                              type="button"
                                              onClick={(e) => handleSubtaskToggle(task, sub, e)}
                                              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                                                sub.checked
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 shadow-2xs'
                                                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 shadow-2xs'
                                              }`}
                                            >
                                              <CheckCircle2 className="w-3 h-3" />
                                              <span>{sub.checked ? 'Đã duyệt' : 'Duyệt'}</span>
                                            </button>
                                            <span className={`text-xs font-semibold truncate ${sub.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                              • {sub.title || sub.name}
                                            </span>
                                          </div>
                                          <div className="text-[11px] font-medium text-slate-500 shrink-0">
                                            ({sub.status?.name || (sub.checked ? 'Hoàn thành' : 'Đang thực hiện')} - {sub.process || 0}%)
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
</div>
)}

        {/* INCIDENTS TAB */}
        {activeTab === 'incidents' && (
          <div>
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Sự cố Liên quan</h3>
            </div>
            <div className="p-2">
              {incidents.length === 0 ? (
                <div className="p-10 text-center text-slate-500 font-medium">Không có sự cố nào liên quan.</div>
              ) : (
                <div className="space-y-1 p-2">
                  {incidents.map(inc => (
                    <div key={inc.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-800">{inc.title}</span>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <span className="font-medium text-blue-600 bg-blue-50 px-1.5 rounded">{inc.projects?.name}</span>
                          {inc.reported_by === staffId ? (
                            <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 rounded">Người báo cáo</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 rounded">Người xử lý</span>
                          )}
                        </div>
                      </div>
                      <Link 
                        href={`/dashboard/projects/${inc.project_id}?tab=incidents`}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* IMPROVEMENTS TAB */}
        {activeTab === 'improvements' && (
          <div>
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Sáng kiến & Cải tiến</h3>
            </div>
            <div className="p-2">
              {improvements.length === 0 ? (
                <div className="p-10 text-center text-slate-500 font-medium">Chưa có sáng kiến nào được ghi nhận.</div>
              ) : (
                <div className="space-y-1 p-2">
                  {improvements.map(imp => (
                    <div key={imp.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-800">{imp.title}</span>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 rounded w-fit mt-1">{imp.projects?.name}</span>
                      </div>
                      <Link 
                        href={`/dashboard/projects/${imp.project_id}?tab=improvements`}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
