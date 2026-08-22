'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import {
  LayoutDashboard, FolderOpen, AlertTriangle,
  Building2, BarChart2, Settings, ChevronLeft, Users,
  Shield, TrendingUp, X, UserCheck
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  setOpen?: (open: boolean) => void
}

type NavItem = { name: string; href: string; icon: any; permission?: Permission | 'owner_only' }

const navItems: NavItem[] = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard, permission: 'view_overview' },
  { name: 'Dự án', href: '/dashboard/projects', icon: FolderOpen, permission: 'view_projects' },
  { name: 'Sự cố & Cải tiến', href: '/dashboard/incidents', icon: AlertTriangle, permission: 'view_incidents' },
  { name: 'Nhân sự', href: '/dashboard/staff', icon: Users, permission: 'view_staff' },
  { name: 'Tổ chức', href: '/dashboard/organizations', icon: Building2, permission: 'view_organization' },
  { name: 'Báo cáo', href: '/dashboard/reports', icon: BarChart2, permission: 'view_reports' },
  { name: 'Phân tích', href: '/dashboard/analytics', icon: TrendingUp, permission: 'view_reports' },
  { name: 'Cài đặt', href: '/dashboard/settings', icon: Settings, permission: 'view_settings' },
  { name: 'Phân quyền', href: '/dashboard/settings/roles', icon: Shield, permission: 'owner_only' },
]

// Super Admin only items
const superAdminItems: NavItem[] = [
  { name: 'Duyệt tài khoản', href: '/dashboard/user-approval', icon: UserCheck },
]

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()
  const { activeOrganization, isSuperAdmin } = useOrganization()
  const { hasPermission, isOwner } = usePermissions()
  const [orgProjects, setOrgProjects] = useState<any[]>([])
  const [pendingUserCount, setPendingUserCount] = useState(0)
  const [projectStatusFilter, setProjectStatusFilter] = useState('active')

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch('/api/v1/apec-global/projects');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items)) {
            const projectsWithCounts = data.items.map((p: any) => ({
              id: p.id,
              name: p.name,
              status: p.project_status?.name || 'active',
              task_count: Number(p.total_tasks || 0),
              member_count: Number(p.total_members || 0),
            }));

            let filtered = projectsWithCounts;
            if (projectStatusFilter === 'active') {
              filtered = projectsWithCounts.filter((p: any) => 
                (p.status || '').toLowerCase().includes('đang') || 
                (p.status || '').toLowerCase().includes('chạy') || 
                p.status === 'active'
              );
            } else if (projectStatusFilter === 'completed') {
              filtered = projectsWithCounts.filter((p: any) => 
                (p.status || '').toLowerCase().includes('hoàn thành') || 
                (p.status || '').toLowerCase().includes('xong') || 
                p.status === 'completed'
              );
            }

            const sorted = filtered.sort((a: any, b: any) => b.task_count - a.task_count);
            setOrgProjects(sorted);
            return;
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách dự án APEC GLOBAL cho Sidebar:', err);
      }

      if (activeOrganization) {
        let query = supabase
          .from('projects')
          .select('id, name, status, tasks(count)')
          .eq('organization_id', activeOrganization.id)
          .is('deleted_at', null);

        if (projectStatusFilter !== 'all') {
          query = query.eq('status', projectStatusFilter);
        }
          
        const { data } = await query;
        if (data) {
          const sorted = [...data].sort((a: any, b: any) => {
            const countA = a.tasks?.[0]?.count || 0;
            const countB = b.tasks?.[0]?.count || 0;
            return countB - countA;
          });
          setOrgProjects(sorted.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            task_count: p.tasks?.[0]?.count || 0
          })));
        }
      } else {
        setOrgProjects([]);
      }
    };
    loadProjects();
  }, [activeOrganization, projectStatusFilter])

  // Fetch pending user count for Super Admin badge
  useEffect(() => {
    if (!isSuperAdmin) return
    const fetchPendingCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/user-approval?status=pending', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        const json = await res.json()
        setPendingUserCount(json.users?.length || 0)
      } catch { /* ignore */ }
    }
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [isSuperAdmin])

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && setOpen) {
      setOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          onClick={() => setOpen?.(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-20 bg-white transition-all duration-300 ease-in-out flex flex-col border-r border-slate-200 overflow-hidden shadow-2xl md:shadow-none ${
          open
            ? 'translate-x-0 w-72 md:w-64'
            : '-translate-x-full md:translate-x-0 w-72 md:w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 mb-2 border-b border-slate-100/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-slate-100">
              <img src="/icon.jpg" alt="NIX.AI" className="w-full h-full object-cover" loading="lazy" />
            </div>
            {(open || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-900 tracking-tight leading-none mb-0.5">NIX.AI</span>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">PROJECT MANAGER</span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setOpen?.(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition-colors"
            title="Đóng menu"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            // Check permissions
            if (item.permission) {
              if (item.permission === 'owner_only') {
                if (!isOwner && !hasPermission('view_settings')) return null;
              } else {
                if (!hasPermission(item.permission as Permission)) return null;
              }
            }

            const Icon = item.icon
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={!open ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-white font-bold' : 'text-slate-600 group-hover:text-slate-900'} ${!open ? 'md:hidden' : ''}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* Super Admin: Duyệt tài khoản */}
          {isSuperAdmin && superAdminItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={!open ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-amber-500 group-hover:text-amber-600'}`} />
                <span className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-white font-bold' : 'text-slate-600 group-hover:text-slate-900'} ${!open ? 'md:hidden' : ''}`}>
                  {item.name}
                </span>
                {pendingUserCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'} animate-pulse`}>
                    {pendingUserCount}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Quick project selection */}
          {hasPermission('view_projects') && activeOrganization && (
            <div className={`mt-6 mb-4 ${!open ? 'md:hidden' : ''}`}>
              <div className="px-3 mb-2 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 max-w-[130px]" title={activeOrganization.name}>
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{activeOrganization.name}</span>
                </div>
                <select 
                  value={projectStatusFilter} 
                  onChange={e => setProjectStatusFilter(e.target.value)}
                  className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 font-medium outline-none cursor-pointer hover:border-slate-300"
                >
                  <option value="active">Đang chạy</option>
                  <option value="completed">Đã xong</option>
                  <option value="all">Tất cả</option>
                </select>
              </div>
              <div className="space-y-1">
                {orgProjects.map(p => (
                  <Link
                    key={p.id}
                    href={`/dashboard/projects/${p.id}`}
                    onClick={handleNavClick}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group ${
                      pathname === `/dashboard/projects/${p.id}`
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    title={`${p.name} — Tổng: ${p.task_stats?.total || p.task_count || 0}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${pathname === `/dashboard/projects/${p.id}` ? 'bg-blue-600' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
                    <span className="text-[13px] truncate flex-1 font-medium">{p.name}</span>
                    
                    {p.task_stats && p.task_stats.total > 0 ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {p.task_stats.active > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700" title="Đang & Chưa thực hiện">
                            {p.task_stats.active}
                          </span>
                        )}
                        {p.task_stats.review > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" title="Chờ duyệt">
                            {p.task_stats.review}
                          </span>
                        )}
                        {p.task_stats.done > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700" title="Hoàn thành (Đã duyệt)">
                            {p.task_stats.done}
                          </span>
                        )}
                      </div>
                    ) : (
                      (p.task_count > 0 || (p.tasks?.[0]?.count > 0)) && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold group-hover:bg-slate-200">
                          {p.task_count !== undefined ? p.task_count : (p.tasks?.[0]?.count || 0)}
                        </span>
                      )
                    )}
                  </Link>
                ))}
                {orgProjects.length === 0 && (
                  <div className="px-3 py-3 text-[11px] text-slate-400 text-center border border-dashed border-slate-200 rounded-lg mx-2">Không có dự án</div>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Desktop Collapse Button */}
        {setOpen && (
          <div className="p-3 mt-auto hidden md:block border-t border-slate-100">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors w-full"
            >
              <ChevronLeft className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${!open && 'rotate-180'}`} />
              {open && <span className="text-sm font-medium whitespace-nowrap">Thu gọn</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
