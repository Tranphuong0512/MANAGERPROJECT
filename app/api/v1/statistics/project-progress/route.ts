import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCachedOrFetch } from '@/lib/services/server-cache'

// ============================================================================
// API: PROJECT PROGRESS — CHI TIẾT TIẾN ĐỘ TỪNG DỰ ÁN (OPTIMIZED & CACHED)
// ============================================================================

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

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

    const cacheKey = `stats:project-progress:${targetOrgId}`;
    const data = await getCachedOrFetch(
      cacheKey,
      async () => {
        // Lấy song song toàn bộ dự án, tasks, và incidents trong 1 lần (loại bỏ lặp N*2 queries)
        const [
          { data: projects },
          { data: allTasks },
          { data: allIncidents },
          { data: allImprovements }
        ] = await Promise.all([
          supabaseAdmin
            .from('projects')
            .select(`
              id, name, code, status, progress_percentage, start_date,
              project_checklists (
                id, title,
                checklist_items (id, status, is_completed, assigned_staff_id)
              )
            `)
            .eq('organization_id', targetOrgId)
            .is('deleted_at', null)
            .order('name'),
          supabaseAdmin
            .from('tasks')
            .select('id, status, progress_percentage, assigned_to, project_id')
            .is('deleted_at', null),
          supabaseAdmin
            .from('incidents')
            .select('id, project_id')
            .is('deleted_at', null),
          supabaseAdmin
            .from('improvements')
            .select('id, project_id')
            .is('deleted_at', null)
        ]);

        const tasksPool = allTasks || [];
        const incidentsPool = allIncidents || [];
        const improvementsPool = allImprovements || [];

        const projectProgress: Array<{
          projectId: string
          projectName: string
          projectCode: string | null
          status: string
          totalChecklistItems: number
          completedChecklistItems: number
          progressPercentage: number
          totalTasks: number
          completedTasks: number
          assignedStaffCount: number
          totalIncidents: number
          totalImprovements: number
        }> = []

        for (const prj of projects || []) {
          // Tính tiến độ từ checklist items
          let totalItems = 0
          let doneItems = 0
          const staffIds = new Set<string>()

          const checklists = (prj as any).project_checklists || []
          for (const cl of checklists) {
            const items = cl.checklist_items || []
            totalItems += items.length
            doneItems += items.filter(
              (i: any) => i.status === 'done' || i.is_completed
            ).length
            items.forEach((i: any) => {
              if (i.assigned_staff_id) staffIds.add(i.assigned_staff_id)
            })
          }

          // Lấy tasks cho dự án này trong bộ nhớ (cực nhanh)
          const tasks = tasksPool.filter((t: any) => String(t.project_id) === String(prj.id));
          const completedTasks = tasks.filter(
            (t: any) => t.status === 'done' || t.status === 'completed' || Number(t.progress_percentage) >= 100
          ).length

          tasks.forEach((t: any) => {
            if (t.assigned_to) staffIds.add(t.assigned_to)
          })

          // Đếm số sự cố và cải tiến trong bộ nhớ
          const incidentCount = incidentsPool.filter((i: any) => String(i.project_id) === String(prj.id)).length;
          const improvementCount = improvementsPool.filter((i: any) => String(i.project_id) === String(prj.id)).length;

          const progress = totalItems > 0
            ? Math.round((doneItems / totalItems) * 100)
            : Number(prj.progress_percentage) || 0;

          projectProgress.push({
            projectId: prj.id,
            projectName: prj.name,
            projectCode: prj.code,
            status: prj.status || 'active',
            totalChecklistItems: totalItems,
            completedChecklistItems: doneItems,
            progressPercentage: progress,
            totalTasks: tasks.length,
            completedTasks,
            assignedStaffCount: staffIds.size,
            totalIncidents: incidentCount || 0,
            totalImprovements: improvementCount || 0,
          })
        }

        // Sắp xếp theo tiến độ giảm dần
        projectProgress.sort((a, b) => b.progressPercentage - a.progressPercentage)

        return {
          projectProgress,
          summary: {
            totalProjects: projectProgress.length,
            avgProgress: projectProgress.length > 0
              ? Math.round(
                  projectProgress.reduce((s, p) => s + p.progressPercentage, 0) / projectProgress.length
                )
              : 0,
            completedProjects: projectProgress.filter(p => p.progressPercentage >= 100).length,
            totalIncidents: projectProgress.reduce((s, p) => s + p.totalIncidents, 0),
            totalImprovements: projectProgress.reduce((s, p) => s + p.totalImprovements, 0),
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
    )
  } catch (error: any) {
    console.error('[Statistics] Project Progress Error:', error)
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
