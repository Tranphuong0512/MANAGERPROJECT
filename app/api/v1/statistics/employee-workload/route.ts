import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCachedOrFetch } from '@/lib/services/server-cache'

// ============================================================================
// API: EMPLOYEE WORKLOAD — KHỐI LƯỢNG CÔNG VIỆC NHÂN SỰ THEO THÁNG (OPTIMIZED & CACHED)
// ============================================================================

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // VD: "2026-07"
    const orgId = searchParams.get('orgId')

    // Xác định khoảng thời gian
    const now = monthParam ? new Date(`${monthParam}-01T00:00:00Z`) : new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Lấy tổ chức chính nếu không truyền orgId
    let targetOrgId = orgId
    if (!targetOrgId) {
      const { data: firstOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      targetOrgId = firstOrg?.id
    }

    if (!targetOrgId) {
      return NextResponse.json(
        { status: 'error', message: 'Không tìm thấy tổ chức' },
        { status: 404 }
      )
    }

    const cacheKey = `stats:employee-workload:${targetOrgId}:${monthParam || 'current'}`;
    const data = await getCachedOrFetch(
      cacheKey,
      async () => {
        // Lấy song song toàn bộ nhân sự, tasks và checklist items trong 1 lần (loại bỏ lặp N*2 queries)
        const [
          { data: allStaff },
          { data: allTasks },
          { data: allClItems }
        ] = await Promise.all([
          supabaseAdmin
            .from('staff')
            .select('id, full_name, role, email, department_id, departments(name)')
            .eq('organization_id', targetOrgId)
            .is('deleted_at', null),
          supabaseAdmin
            .from('tasks')
            .select('id, status, progress_percentage, assigned_to')
            .is('deleted_at', null)
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth),
          supabaseAdmin
            .from('checklist_items')
            .select('id, status, is_completed, assigned_staff_id, assignee_ids')
            .is('deleted_at', null)
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)
        ]);

        const staffPool = allStaff || []
        const tasksPool = allTasks || []
        const clItemsPool = allClItems || []

        // Build workload data cho từng nhân sự trong bộ nhớ (cực nhanh)
        const employeeWorkload: Array<{
          employeeId: string
          fullName: string
          position: string
          department: string
          totalTasks: number
          completedTasks: number
          inProgressTasks: number
          totalChecklistItems: number
          completedChecklistItems: number
          completionRate: number
        }> = []

        for (const staff of staffPool) {
          const tasks = tasksPool.filter((t: any) => String(t.assigned_to) === String(staff.id));
          const clItems = clItemsPool.filter((c: any) => 
            String(c.assigned_staff_id) === String(staff.id) || 
            (Array.isArray(c.assignee_ids) && c.assignee_ids.some((id: any) => String(id) === String(staff.id)))
          );

          const completedTasks = tasks.filter(
            (t: any) => t.status === 'done' || t.status === 'completed' || Number(t.progress_percentage) >= 100
          ).length
          const inProgressTasks = tasks.filter(
            (t: any) => t.status === 'in_progress' && Number(t.progress_percentage) < 100
          ).length

          const completedClItems = clItems.filter(
            (c: any) => c.status === 'done' || c.is_completed
          ).length

          const totalWork = tasks.length + clItems.length
          const doneWork = completedTasks + completedClItems

          employeeWorkload.push({
            employeeId: staff.id,
            fullName: staff.full_name,
            position: staff.role || 'Thành viên',
            department: (staff as any).departments?.name || 'Chưa phân phòng',
            totalTasks: tasks.length,
            completedTasks,
            inProgressTasks,
            totalChecklistItems: clItems.length,
            completedChecklistItems: completedClItems,
            completionRate: totalWork > 0 ? Math.round((doneWork / totalWork) * 100) : 0,
          })
        }

        employeeWorkload.sort((a, b) => {
          const totalA = a.totalTasks + a.totalChecklistItems
          const totalB = b.totalTasks + b.totalChecklistItems
          return totalB - totalA
        })

        return {
          employeeWorkload,
          summary: {
            totalEmployees: staffPool.length,
            employeesWithWork: employeeWorkload.filter(
              e => e.totalTasks + e.totalChecklistItems > 0
            ).length,
            avgCompletionRate: employeeWorkload.length > 0
              ? Math.round(
                  employeeWorkload.reduce((s, e) => s + e.completionRate, 0) / employeeWorkload.length
                )
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
        metadata: {
          month: now.toISOString().slice(0, 7),
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          organizationId: targetOrgId,
        },
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
    console.error('[Statistics] Employee Workload Error:', error)
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
