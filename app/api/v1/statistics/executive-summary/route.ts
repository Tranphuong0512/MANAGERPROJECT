import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCachedOrFetch } from '@/lib/services/server-cache'
import { getApecEmployees } from '@/lib/services/apec-global-api'

// ============================================================================
// API: EXECUTIVE SUMMARY — THỐNG KÊ TỔNG QUAN LÃNH ĐẠO (OPTIMIZED CONCURRENT & CACHED)
// ============================================================================

export async function GET() {
  try {
    const data = await getCachedOrFetch(
      'stats:executive-summary',
      async () => {
        const supabaseAdmin = getSupabaseAdminClient();

        // Chạy song song toàn bộ truy vấn Database trong 1 lần (loại bỏ hoàn toàn N+1 queries)
        const [
          { data: orgs },
          { data: allProjects },
          { data: allTasks },
          { data: allChecklistItems },
          { data: staffRows },
          apecEmpRes
        ] = await Promise.all([
          supabaseAdmin.from('organizations').select('id, name').is('deleted_at', null),
          supabaseAdmin
            .from('projects')
            .select(`
              id, name, status, progress_percentage, organization_id,
              project_checklists (
                checklist_items (status, is_completed)
              )
            `)
            .is('deleted_at', null),
          supabaseAdmin.from('tasks').select('id, status, progress_percentage').is('deleted_at', null),
          supabaseAdmin.from('checklist_items').select('id, status, is_completed').is('deleted_at', null),
          supabaseAdmin.from('staff').select('id, full_name, role, department_id, departments(name)').is('deleted_at', null),
          getApecEmployees().catch(() => ({ success: false, items: [] as any[] })),
        ]);

        const apecEmployees: any[] = apecEmpRes && Array.isArray((apecEmpRes as any).items) ? (apecEmpRes as any).items : []

        // ===== 1. TIẾN ĐỘ DỰ ÁN THEO TỔ CHỨC / CÔNG TY =====
        const projectsByOrgMap = new Map<string, any[]>();
        for (const prj of allProjects || []) {
          const orgId = String(prj.organization_id || '');
          if (!projectsByOrgMap.has(orgId)) projectsByOrgMap.set(orgId, []);
          projectsByOrgMap.get(orgId)!.push(prj);
        }

        const projectsByCompany: Array<{
          companyId: string
          companyName: string
          totalProjects: number
          avgProgress: number
          completedProjects: number
          activeProjects: number
        }> = []

        for (const org of orgs || []) {
          const projects = projectsByOrgMap.get(String(org.id)) || [];
          if (projects.length === 0) continue;

          let totalProgress = 0
          let completedCount = 0
          let activeCount = 0

          for (const prj of projects) {
            let totalItems = 0
            let doneItems = 0
            const checklists = (prj as any).project_checklists || []
            for (const cl of checklists) {
              const items = cl.checklist_items || []
              totalItems += items.length
              doneItems += items.filter((i: any) => i.status === 'done' || i.is_completed).length
            }

            const progress = totalItems > 0
              ? Math.round((doneItems / totalItems) * 100)
              : Number(prj.progress_percentage) || 0

            totalProgress += progress

            if (prj.status === 'completed' || progress >= 100) completedCount++
            else activeCount++
          }

          projectsByCompany.push({
            companyId: org.id,
            companyName: org.name,
            totalProjects: projects.length,
            avgProgress: projects.length > 0
              ? Math.round(totalProgress / projects.length)
              : 0,
            completedProjects: completedCount,
            activeProjects: activeCount,
          })
        }

        // ===== 2. PHÂN BỐ TRẠNG THÁI CÔNG VIỆC =====
        const tasks = allTasks || []
        const clItems = allChecklistItems || []

        const allWorkItems = [
          ...tasks.map((t: any) => ({
            status: t.status,
            isDone: t.status === 'done' || t.status === 'completed' || Number(t.progress_percentage) >= 100,
          })),
          ...clItems.map((c: any) => ({
            status: c.status || (c.is_completed ? 'done' : 'todo'),
            isDone: c.status === 'done' || c.is_completed,
          })),
        ]

        const taskStatusDistribution = {
          total: allWorkItems.length,
          todo: allWorkItems.filter((w: any) => w.status === 'todo' || !w.status).length,
          inProgress: allWorkItems.filter((w: any) => w.status === 'in_progress').length,
          done: allWorkItems.filter((w: any) => w.isDone).length,
          overdue: 0,
        }

        // ===== 3. NHÂN SỰ THEO PHÒNG BAN (MERGED SUPABASE + APEC GLOBAL) =====
        const staffByDept: Record<string, { name: string; count: number }> = {}
        const uniqueStaff = new Set<string>();

        // Thêm nhân sự APEC Global
        if (Array.isArray(apecEmployees)) {
          for (const e of apecEmployees) {
            const key = (e.fullname || e.name || '').trim().toLowerCase() || String(e.id || '');
            if (key && !uniqueStaff.has(key)) {
              uniqueStaff.add(key);
              const deptName = typeof e.department === 'object' && e.department?.name 
                ? e.department.name 
                : (typeof e.department === 'string' && e.department.trim() 
                  ? e.department 
                  : (e.department_name || e.dept_name || 'Phòng Nghiệp Vụ'));
              if (!staffByDept[deptName]) {
                staffByDept[deptName] = { name: deptName, count: 0 }
              }
              staffByDept[deptName].count++
            }
          }
        }

        // Thêm nhân sự Supabase Staff nếu chưa có
        for (const s of staffRows || []) {
          const key = (s.full_name || '').trim().toLowerCase() || String(s.id || '');
          if (key && !uniqueStaff.has(key)) {
            uniqueStaff.add(key);
            const deptName = (s as any).departments?.name || 'Phòng ban nội bộ'
            if (!staffByDept[deptName]) {
              staffByDept[deptName] = { name: deptName, count: 0 }
            }
            staffByDept[deptName].count++
          }
        }

        const staffDistribution = Object.values(staffByDept)
          .sort((a, b) => b.count - a.count)

        const totalStaffCount = uniqueStaff.size > 0 
          ? uniqueStaff.size 
          : Math.max((apecEmployees || []).length, (staffRows || []).length);

        return {
          projectsByCompany: projectsByCompany.sort((a, b) => b.totalProjects - a.totalProjects),
          taskStatusDistribution,
          staffDistribution,
          summary: {
            totalCompanies: projectsByCompany.length,
            totalProjects: projectsByCompany.reduce((s, c) => s + c.totalProjects, 0),
            totalStaff: totalStaffCount,
            totalWorkItems: allWorkItems.length,
            overallCompletionRate: allWorkItems.length > 0
              ? Math.round((taskStatusDistribution.done / allWorkItems.length) * 100)
              : 0,
          },
        };
      },
      { staleTimeMs: 15_000, expireTimeMs: 300_000 }
    );

    return NextResponse.json(
      {
        status: 'success',
        timestamp: new Date().toISOString(),
        data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    console.error('[Statistics] Executive Summary Error:', error)
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
