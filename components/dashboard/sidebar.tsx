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
  Shield, TrendingUp
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  setOpen?: (open: boolean) => void
}

type NavItem = { name: string; href: string; icon: any; permission?: Permission | 'owner_only' }

const navItems: NavItem[] = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Dự án', href: '/dashboard/projects', icon: FolderOpen, permission: 'view_projects' },
  { name: 'Sự cố & Cải tiến', href: '/dashboard/incidents', icon: AlertTriangle, permission: 'view_incidents' },
  { name: 'Nhân sự', href: '/dashboard/staff', icon: Users, permission: 'view_staff' },
  { name: 'Tổ chức', href: '/dashboard/organizations', icon: Building2, permission: 'view_organization' },
  { name: 'Báo cáo', href: '/dashboard/reports', icon: BarChart2, permission: 'view_reports' },
  { name: 'Phân tích', href: '/dashboard/analytics', icon: TrendingUp, permission: 'view_reports' },
  { name: 'Cài đặt', href: '/dashboard/settings', icon: Settings, permission: 'view_settings' },
  { name: 'Phân quyền', href: '/dashboard/settings/roles', icon: Shield, permission: 'owner_only' },
]

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()
  const { activeOrganization } = useOrganization()
  const { hasPermission, isOwner } = usePermissions()
  const [orgProjects, setOrgProjects] = useState<any[]>([])
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

  return (
    <div
      className={`${open ? 'w-64' : 'w-20'
        } bg-white transition-all duration-300 overflow-hidden flex flex-col border-r border-slate-200 relative z-20`}
    >
      <div className="h-16 flex items-center px-6 mb-4">
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-slate-100">
            <img src="/icon.jpg" alt="NIX.AI" className="w-full h-full object-cover" loading="lazy" />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none mb-0.5">NIX.AI</span>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">PROJECT MANAGER</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {navItems.map((item) => {
          // Check permissions
          if (item.permission) {
            if (item.permission === 'owner_only') {
              if (!isOwner && !hasPermission('view_settings')) return null;
            } else {
              // Only view_incidents is mapped above. If they have view_improvements they might also want to see it, 
              // but we'll just check the exact permission mapped.
              if (!hasPermission(item.permission as Permission)) return null;
            }
          }

          const Icon = item.icon
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              title={!open ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {open && <span className={`text-[15px] font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>{item.name}</span>}
            </Link>
          )
        })}

        {/* Quick project selection */}
        {open && hasPermission('view_projects') && activeOrganization && (
          <div className="mt-8 mb-4">
            <div className="px-3 mb-2 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 max-w-[120px]" title={activeOrganization.name}>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group ${pathname === `/dashboard/projects/${p.id}`
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  title={`${p.name} — Tổng: ${p.task_stats?.total || p.task_count || 0} | Đang/Chưa làm: ${p.task_stats?.active || 0} | Chờ duyệt: ${p.task_stats?.review || 0} | Hoàn thành: ${p.task_stats?.done || 0}`}
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600" title="Tổng việc cha">
                        {p.task_stats.total}
                      </span>
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
                <div className="px-3 py-3 text-[11px] text-slate-400 text-center border border-dashed border-slate-200 rounded-lg mx-3">Không có dự án</div>
              )}
            </div>
          </div>
        )}
      </nav>

      {setOpen && (
        <div className="p-4 mt-auto">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors w-full"
          >
            <ChevronLeft className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${!open && 'rotate-180'}`} />
            {open && <span className="text-[15px] font-medium whitespace-nowrap">Thu gọn</span>}
          </button>
        </div>
      )}
    </div>
  )
}
