'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Building2, Users, Edit2, Trash2, FolderKanban, AlertTriangle, Lightbulb, Network, KeyRound, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { CreateStaffDialog } from '@/components/staff/CreateStaffDialog'
import { CreateDepartmentDialog } from '@/components/staff/CreateDepartmentDialog'
import { EditStaffDialog } from '@/components/staff/EditStaffDialog'
import { useOrganization } from '@/components/providers/organization-provider'
import { usePermissions } from '@/hooks/usePermissions'
import { customConfirm } from '@/utils/alert'

export default function StaffPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'staff' | 'accounts' | 'departments'>('staff')
  const [isLoading, setIsLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState('')
  
  const [staff, setStaff] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  const [showStaffDialog, setShowStaffDialog] = useState(false)
  const [showDeptDialog, setShowDeptDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  const staffGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    staff.forEach((s: any) => {
      const depts = s.departments && s.departments.length > 0 ? s.departments : ['APEC GLOBAL'];
      depts.forEach((d: string) => {
        if (!groups[d]) groups[d] = [];
        groups[d].push(s);
      });
    });

    const q = searchQuery.trim().toLowerCase();
    const result: {
      name: string;
      members: any[];
      staffCount: number;
      totalTasks: number;
      completedTasks: number;
      avgProgress: number;
      totalIncidents: number;
      totalImprovements: number;
    }[] = [];

    Object.keys(groups).sort((a, b) => a.localeCompare(b)).forEach((deptName) => {
      const rawMembers = groups[deptName];
      const members = q
        ? rawMembers.filter((s: any) =>
            s.full_name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.role?.toLowerCase().includes(q) ||
            deptName.toLowerCase().includes(q)
          )
        : rawMembers;

      if (members.length > 0) {
        const totalTasks = members.reduce((sum, s) => sum + (s.stats?.tasks || 0), 0);
        const completedTasks = members.reduce((sum, s) => sum + (s.stats?.completedTasks || 0), 0);
        const avgProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const totalIncidents = members.reduce((sum, s) => sum + (s.stats?.incidents || 0), 0);
        const totalImprovements = members.reduce((sum, s) => sum + (s.stats?.improvements || 0), 0);

        result.push({
          name: deptName,
          members,
          staffCount: members.length,
          totalTasks,
          completedTasks,
          avgProgress,
          totalIncidents,
          totalImprovements,
        });
      }
    });

    return result;
  }, [staff, searchQuery]);

  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (isLoadingOrg) return
    const loadData = async () => {
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const orgId = activeOrganization?.id || ''
        if (orgId) {
          setOrganizationId(orgId)
        }
        await loadStaffAndDepartments(orgId)
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Lắng nghe sự kiện đồng bộ tự động để cập nhật nhân sự & phòng ban ngay tức thì
    const handleApecSynced = () => {
      const orgId = activeOrganization?.id || ''
      if (orgId) {
        loadStaffAndDepartments(orgId)
      }
    }

    window.addEventListener('apec-global-synced', handleApecSynced)
    return () => window.removeEventListener('apec-global-synced', handleApecSynced)
  }, [router, activeOrganization, isLoadingOrg])

    const loadStaffAndDepartments = async (orgId: string) => {
    try {
      // Load departments, staff table (APEC GLOBAL employees), and software login accounts in parallel
      const deptsPromise = orgId ? supabase
        .from('departments')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('name') : Promise.resolve({ data: [] });
        
      const apecStaffPromise = orgId ? supabase
        .from('staff')
        .select(`
          id, organization_id, full_name, email, phone, role, department_id,
          departments(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('full_name') : Promise.resolve({ data: [] });

      const { data: { session } } = await supabase.auth.getSession()
      const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined

      const accountsPromise = fetch('/api/staff', { headers: authHeaders })
        .then(res => res.json())
        .catch(() => ({ accounts: [] }));
        
      const [deptsResult, apecStaffResult, accountsResult, liveEmpRes] = await Promise.all([
        deptsPromise,
        apecStaffPromise,
        accountsPromise,
        fetch('/api/v1/apec-global/employees').then(r => r.json()).catch(() => ({ success: false, items: [] }))
      ]);
      
      setDepartments(deptsResult.data || [])
      let apecStaffData = apecStaffResult.data || [];
      const accountList = accountsResult.accounts || [];

      // 1. Danh sách Nhân sự lấy real-time trực tiếp từ API của APEC GLOBAL
      if (liveEmpRes.success && liveEmpRes.items && liveEmpRes.items.length > 0) {
        apecStaffData = liveEmpRes.items.map((e: any) => {
          const deptName = typeof e.department === 'object' && e.department?.name
            ? e.department.name
            : (typeof e.department === 'string' && e.department.trim()
                ? e.department
                : (e.department_name || e.dept_name || e.company_name || 'Chưa phân phòng ban'));
          const roleTitle = e.positions?.name || e.position?.name || e.position || e.job_title || 'Nhân sự APEC GLOBAL';
          return {
            id: `apec_${e.id}`,
            apec_id: e.id,
            full_name: e.name || e.fullname || 'Chưa rõ',
            email: e.email || 'Đang cập nhật',
            phone: e.phone || 'Đang cập nhật',
            role: roleTitle,
            avatar: e.avatar || e.avatar_url,
            departments: { name: deptName }
          };
        });
      }

      const apecStaffList = apecStaffData.map((s: any) => ({
        id: s.id,
        org_member_id: s.id,
        full_name: s.full_name || 'Chưa rõ',
        departments: s.departments?.name ? [s.departments.name] : [],
        role: s.role || 'Nhân sự APEC GLOBAL',
        email: s.email || 'Đang cập nhật',
        phone: s.phone || 'Đang cập nhật',
        avatar: s.avatar || null,
        stats: {
          tasks: 0,
          completedTasks: 0,
          checklists: 0,
          incidentsReported: 0,
          incidentsAssigned: 0,
          incidentsResolved: 0,
          incidents: 0,
          improvements: 0,
          orgs: 1
        },
        isApec: true
      }));

      // Đồng bộ thông tin phòng ban mới nhất từ APEC vào danh sách tài khoản nếu trùng khớp email/họ tên
      const mergedAccounts = accountList.map((acc: any) => {
        const matchedApec = apecStaffList.find((a: any) => 
          (a.email && a.email !== 'Đang cập nhật' && a.email.toLowerCase().trim() === (acc.email || '').toLowerCase().trim()) ||
          (a.full_name && a.full_name.toLowerCase().trim() === (acc.full_name || '').toLowerCase().trim())
        );
        if (matchedApec && matchedApec.departments.length > 0) {
          return {
            ...acc,
            full_name: matchedApec.full_name || acc.full_name,
            departments: matchedApec.departments,
            role: acc.role || matchedApec.role
          };
        }
        return acc;
      });

      // Lọc các nhân sự APEC chưa có tài khoản phần mềm
      const nonAccountApecStaff = apecStaffList.filter((a: any) => {
        return !mergedAccounts.some((acc: any) => 
          (a.email && a.email !== 'Đang cập nhật' && a.email.toLowerCase().trim() === (acc.email || '').toLowerCase().trim()) ||
          (a.full_name && a.full_name.toLowerCase().trim() === (acc.full_name || '').toLowerCase().trim())
        );
      });

      const allPeople = [...mergedAccounts, ...nonAccountApecStaff];

      if (allPeople.length > 0) {
        const userIds = allPeople.map((s: any) => s.id);
        
        // Fetch all stats in parallel (checklist_items + tasks + Apec Global tasks)
        const [tasksRes, projTasksRes, incidentsRes, improvementsRes, orgMembersRes, apecTasksRes] = await Promise.all([
          supabase.from('checklist_items').select('id, checklist_id, assigned_staff_id, assignee_ids, is_completed, status, project_checklists!inner(projects!inner(organization_id))').eq('project_checklists.projects.organization_id', orgId).is('deleted_at', null).is('project_checklists.deleted_at', null).is('project_checklists.projects.deleted_at', null),
          supabase.from('tasks').select('id, title, status, assigned_to, progress_percentage').is('deleted_at', null),
          supabase.from('incidents').select('reported_by, assigned_to, id, status').or(`reported_by.in.(${userIds.join(',')}),assigned_to.in.(${userIds.join(',')})`).eq('organization_id', orgId).is('deleted_at', null),
          supabase.from('improvements').select('reporter_id, id').in('reporter_id', userIds).eq('organization_id', orgId),
          supabase.from('organization_members').select('user_id, id').in('user_id', userIds).is('deleted_at', null),
          fetch('/api/v1/apec-global/tasks').then(r => r.json()).catch(() => ({ success: false, items: [] }))
        ]);

        const tasksData = tasksRes.data || [];
        const projTasksData = projTasksRes.data || [];
        const incidentsData = incidentsRes.data || [];
        const improvementsData = improvementsRes.data || [];
        const orgMembersData = orgMembersRes.data || [];
        const apecTasksList = apecTasksRes.items || [];

        allPeople.forEach((s: any) => {
          const userChecklistTasks = tasksData.filter((t: any) => t.assigned_staff_id === s.id || (Array.isArray(t.assignee_ids) && t.assignee_ids.includes(s.id)));
          const userProjTasks = projTasksData.filter((t: any) => t.assigned_to === s.id);
          
          const uniqueChecklists = new Set(userChecklistTasks.map((t: any) => t.checklist_id)).size;
          const totalTasks = userChecklistTasks.length + userProjTasks.length;
          const completedTasks = userChecklistTasks.filter((t: any) => t.status === 'done' || t.is_completed).length + userProjTasks.filter((t: any) => t.status === 'done' || t.status === 'completed' || Number(t.progress_percentage) >= 100).length;

          // Apec Global tasks stats
          const rawId = String(s.id).replace('apec_', '');
          const sName = (s.full_name || '').trim().toLowerCase();
          const apecTasks = apecTasksList.filter((t: any) => {
            const assigneeId = t.assignee?.id !== undefined ? String(t.assignee.id) : (typeof t.assignee === 'string' || typeof t.assignee === 'number' ? String(t.assignee) : '');
            const assigneeName = (t.assignee?.name || t.assignee?.fullname || (typeof t.assignee === 'string' ? t.assignee : '')).trim().toLowerCase();
            const matchesDirect = assigneeId === rawId || assigneeId === String(s.id) || (sName && assigneeName === sName);
            const matchesSub = Array.isArray(t.employee_assignments) && t.employee_assignments.some((ea: any) => {
              const eaId = ea.employee?.id !== undefined ? String(ea.employee.id) : '';
              const eaName = (ea.employee?.name || ea.employee?.fullname || '').trim().toLowerCase();
              return eaId === rawId || eaId === String(s.id) || (sName && eaName === sName);
            });
            return matchesDirect || matchesSub;
          });

          const uniqueApecChecklists = new Set(apecTasks.map((t: any) => t.type?.name || t.type?.id || t.checklist_id || 'Checklist API')).size;
          const completedApecTasks = apecTasks.filter((t: any) => {
            const isDoneStatus = t.status === 'done' || t.status === 'completed' || (typeof t.status === 'object' && t.status?.name?.toLowerCase().includes('hoàn thành'));
            const isDoneProg = Number(t.progress || t.process) >= 100;
            return isDoneStatus || isDoneProg;
          }).length;
          
          s.stats.tasks = totalTasks + apecTasks.length;
          s.stats.completedTasks = completedTasks + completedApecTasks;
          s.stats.checklists = Math.max(uniqueChecklists, uniqueApecChecklists);
          s.stats.incidentsReported = incidentsData.filter((i: any) => i.reported_by === s.id).length;
          s.stats.incidentsAssigned = incidentsData.filter((i: any) => i.assigned_to === s.id).length;
          s.stats.incidentsResolved = incidentsData.filter((i: any) => i.assigned_to === s.id && (i.status === 'resolved' || i.status === 'closed')).length;
          s.stats.incidents = s.stats.incidentsReported + s.stats.incidentsAssigned;
          s.stats.improvements = improvementsData.filter((i: any) => i.reporter_id === s.id).length;
          s.stats.orgs = Math.max(1, orgMembersData.filter((om: any) => om.user_id === s.id).length);
        });
      }

      setStaff(apecStaffList.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)));
      setAccounts(accountList.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)));
    } catch (err) {
      console.error('Error loading staff/departments:', err);
    }
  }

  const handleDeleteStaff = async (id: string, org_member_id: string) => {
    if (!(await customConfirm('Bạn có chắc muốn xóa nhân sự này khỏi tổ chức?'))) return
    try {
      await supabase.from('organization_members').delete().eq('id', org_member_id)
      loadStaffAndDepartments(organizationId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditStaff = (staffMember: any) => {
    setSelectedStaff(staffMember)
    setShowEditDialog(true)
  }

  const handleDeleteDept = async (id: string) => {
    if (!(await customConfirm('Bạn có chắc muốn xóa phòng ban này? (Những nhân sự thuộc phòng ban sẽ bị gỡ phòng ban)'))) return
    try {
      await supabase.from('departments').delete().eq('id', id)
      loadStaffAndDepartments(organizationId)
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Nhân sự & Phòng ban</h1>
          <p className="text-sm text-slate-500">Quản lý nhân sự đồng bộ từ APEC GLOBAL, phòng ban và tài khoản đăng nhập phần mềm.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasPermission('create_organization') && (
            <button
              onClick={() => setShowDeptDialog(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo phòng ban
            </button>
          )}
          {hasPermission('create_staff') && (
            <button
              onClick={() => {
                setActiveTab('accounts')
                setShowStaffDialog(true)
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo tài khoản
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Danh sách Nhân sự ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'accounts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Tài khoản ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'departments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Phòng ban ({departments.length})
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'staff' ? (
          <div className="space-y-6">
            {/* Ô tìm kiếm nhanh nhân sự + nút mở rộng / thu gọn */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nhanh nhân sự theo tên, email, chức vụ, phòng ban..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded"
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <span className="text-xs font-semibold text-slate-500">
                  Hiển thị {staffGroups.length} phòng ban • {staffGroups.reduce((acc, g) => acc + g.staffCount, 0)} nhân sự
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allExpanded = staffGroups.every(g => expandedDepts[g.name]);
                    const next: Record<string, boolean> = {};
                    if (!allExpanded) {
                      staffGroups.forEach(g => { next[g.name] = true; });
                    }
                    setExpandedDepts(next);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                >
                  {staffGroups.length > 0 && staffGroups.every(g => expandedDepts[g.name]) ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                </button>
              </div>
            </div>

            {/* Danh sách phòng ban trước -> Nhấp vào phòng ban mới hiển thị tên nhân sự */}
            {staffGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-slate-100 text-center text-slate-500 shadow-sm">
                {searchQuery ? `Không tìm thấy nhân sự nào phù hợp với từ khóa "${searchQuery}".` : 'Chưa có nhân sự đồng bộ từ API APEC GLOBAL. Vui lòng mở Cổng kết nối API để đồng bộ dữ liệu.'}
              </div>
            ) : (
              <div className="space-y-4">
                {staffGroups.map((group) => {
                  const isExpanded = !!expandedDepts[group.name] || searchQuery.trim().length > 0;
                  return (
                    <div
                      key={group.name}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300"
                    >
                      {/* Department Header Row */}
                      <div
                        onClick={() => setExpandedDepts(prev => ({ ...prev, [group.name]: !isExpanded }))}
                        className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 bg-gradient-to-r from-slate-50/80 to-white hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100"
                      >
                        {/* Left: Department Icon + Name + Staff count badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shrink-0 shadow-xs">
                            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-base sm:text-lg hover:text-blue-600 transition-colors truncate">
                                {group.name}
                              </h3>
                              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200 shrink-0">
                                {group.staffCount} nhân sự
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              Nhấp để {isExpanded ? 'thu gọn' : 'hiển thị danh sách nhân sự liên quan'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Statistics summary */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto">
                          {/* Công việc & Tiến độ */}
                          <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-100" title="Tổng số công việc và tiến độ trung bình của phòng ban">
                            <FolderKanban className="w-4 h-4 text-blue-500 shrink-0" />
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiến độ</div>
                              <div className="text-xs sm:text-sm font-black text-blue-600">
                                {group.avgProgress}% <span className="text-[11px] font-semibold text-slate-500">({group.completedTasks}/{group.totalTasks})</span>
                              </div>
                            </div>
                            <div className="w-12 sm:w-16 bg-slate-200 h-1.5 sm:h-2 rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${group.avgProgress}%` }}></div>
                            </div>
                          </div>

                          {/* Rủi ro & Sự cố */}
                          <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border border-rose-100" title="Tổng số rủi ro, sự cố liên quan trong phòng ban">
                            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span>{group.totalIncidents} sự cố</span>
                          </div>

                          {/* Sáng kiến & Cải tiến */}
                          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border border-amber-100" title="Tổng số sáng kiến, cải tiến trong phòng ban">
                            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span>{group.totalImprovements} cải tiến</span>
                          </div>

                          {/* Expand/Collapse Chevron */}
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 ml-auto lg:ml-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Department Staff List (Khi nhấp vào phòng ban mới hiển thị tên nhân sự liên quan) */}
                      {isExpanded && (
                        <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {group.members.map((s: any) => {
                              const progress = s.stats.tasks > 0 ? Math.round((s.stats.completedTasks / s.stats.tasks) * 100) : 0;
                              return (
                                <div key={`${s.id}-${s.org_member_id}`} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden">
                                  <div className="flex items-start gap-4 mb-4">
                                    <Link href={`/dashboard/staff/${s.id}`}>
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 hover:opacity-90 transition-opacity">
                                        {s.full_name.charAt(0).toUpperCase()}
                                      </div>
                                    </Link>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                          APEC GLOBAL
                                        </span>
                                      </div>
                                      <Link href={`/dashboard/staff/${s.id}`}>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1 hover:text-blue-600 transition-colors">{s.full_name}</h3>
                                      </Link>
                                      <p className="text-sm font-medium text-slate-500">{s.role || 'Nhân viên'}</p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 mb-5">
                                    {s.departments && s.departments.length > 0 ? (
                                      s.departments.map((deptName: string) => (
                                        <span key={deptName} className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-100">
                                          {deptName}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-100">
                                        APEC GLOBAL
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5 text-blue-500" /> Tiến độ công việc</span>
                                        <span className="text-xs font-bold text-blue-600">{progress}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${progress}%` }}></div>
                                      </div>
                                      <div className="flex justify-between items-center mt-2 text-[11px] font-medium text-slate-500">
                                        <span>{s.stats.completedTasks || 0} / {s.stats.tasks || 0} công việc</span>
                                        <span>{s.stats.checklists || 0} checklist</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                      <div className="flex items-center gap-1.5 bg-rose-50/50 text-rose-600 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" title="Sự cố liên quan">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {s.stats.incidents}
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-amber-50/50 text-amber-600 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" title="Sáng kiến đóng góp">
                                        <Lightbulb className="w-3.5 h-3.5" />
                                        {s.stats.improvements}
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-indigo-50/50 text-indigo-600 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" title="Tổ chức tham gia">
                                        <Network className="w-3.5 h-3.5" />
                                        {s.stats.orgs}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'accounts' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-500 shadow-sm">
                Chưa có tài khoản đăng nhập nào. Nhấn "Tạo tài khoản" để thêm mới.
              </div>
            ) : accounts.map((s) => {
              const progress = s.stats.tasks > 0 ? Math.round((s.stats.completedTasks / s.stats.tasks) * 100) : 0;
              return (
                <div key={`${s.id}-${s.org_member_id}`} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden">
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasPermission('edit_staff') && (
                      <button onClick={() => handleEditStaff(s)} className="p-2 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasPermission('delete_staff') && (
                      <button onClick={() => handleDeleteStaff(s.id, s.org_member_id)} className="p-2 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <Link href={`/dashboard/staff/${s.id}`}>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 hover:opacity-90 transition-opacity">
                        {s.full_name.charAt(0).toUpperCase()}
                      </div>
                    </Link>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Tài khoản phần mềm
                        </span>
                      </div>
                      <Link href={`/dashboard/staff/${s.id}`}>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1 hover:text-blue-600 transition-colors">{s.full_name}</h3>
                      </Link>
                      <p className="text-sm font-medium text-slate-500">{s.role || 'Thành viên'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {s.departments && s.departments.length > 0 ? (
                      s.departments.map((deptName: string) => (
                        <span key={deptName} className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-100">
                          {deptName}
                        </span>
                      ))
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg text-[11px] font-medium border border-slate-100 italic">
                        Chưa gắn phòng ban
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5 text-blue-500" /> Tiến độ công việc</span>
                        <span className="text-xs font-bold text-blue-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[11px] font-medium text-slate-500">
                        <span>{s.stats.completedTasks || 0} / {s.stats.tasks || 0} công việc</span>
                        <span>{s.stats.checklists || 0} checklist</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-1.5 bg-rose-50/50 text-rose-600 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" title="Sự cố liên quan">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {s.stats.incidents}
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-50/50 text-amber-600 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" title="Sáng kiến đóng góp">
                        <Lightbulb className="w-3.5 h-3.5" />
                        {s.stats.improvements}
                      </div>
                      <div className="flex items-center gap-1.5 bg-indigo-50/50 text-indigo-600 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" title="Tổ chức tham gia">
                        <Network className="w-3.5 h-3.5" />
                        {s.stats.orgs}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Tên phòng ban</th>
                    <th className="px-6 py-4">Mô tả</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                        Chưa có phòng ban nào. Hãy tạo phòng ban mới.
                      </td>
                    </tr>
                  ) : departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          <span className="font-bold text-slate-800">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{d.description || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasPermission('edit_organization') && (
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('delete_organization') && (
                            <button onClick={() => handleDeleteDept(d.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CreateStaffDialog
        open={showStaffDialog}
        onOpenChange={setShowStaffDialog}
        organizationId={organizationId}
        onCreated={() => loadStaffAndDepartments(organizationId)}
      />

      <CreateDepartmentDialog
        open={showDeptDialog}
        onOpenChange={setShowDeptDialog}
        organizationId={organizationId}
        onCreated={() => loadStaffAndDepartments(organizationId)}
      />

      <EditStaffDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        organizationId={organizationId}
        staff={selectedStaff}
        onSaved={() => loadStaffAndDepartments(organizationId)}
      />
    </div>
  )
}

