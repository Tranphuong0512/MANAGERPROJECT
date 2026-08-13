import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminRequest } from '@/lib/admin-route-guard'

/**
 * POST /api/v1/projects/cleanup-duplicates
 * Tìm và xóa tất cả dự án trùng tên trong cùng một tổ chức.
 * Giữ lại dự án cũ nhất (created_at sớm nhất), xóa các bản trùng.
 */
export async function POST(request: NextRequest) {
  try {
    const adminGuard = await requireAdminRequest(request)
    if (!adminGuard.authorized) return adminGuard.response

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lấy toàn bộ dự án chưa bị xóa, sắp xếp theo tên và ngày tạo
    const { data: allProjects, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('id, name, organization_id, created_at, code')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    if (!allProjects || allProjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có dự án nào trong hệ thống.',
        deleted: [],
        deletedCount: 0,
      })
    }

    // Nhóm theo (organization_id + name) để tìm trùng
    const grouped: Record<string, typeof allProjects> = {}
    for (const project of allProjects) {
      const key = `${project.organization_id}::${(project.name || '').toLowerCase().trim()}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(project)
    }

    // Tìm các bản trùng cần xóa (giữ lại bản đầu tiên - cũ nhất)
    const idsToDelete: string[] = []
    const deletedDetails: Array<{ id: string; name: string; organization_id: string }> = []

    for (const [, projects] of Object.entries(grouped)) {
      if (projects.length > 1) {
        // Bỏ qua bản đầu tiên (cũ nhất), xóa các bản còn lại
        for (let i = 1; i < projects.length; i++) {
          idsToDelete.push(projects[i].id)
          deletedDetails.push({
            id: projects[i].id,
            name: projects[i].name,
            organization_id: projects[i].organization_id,
          })
        }
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không tìm thấy dự án trùng lặp nào.',
        deleted: [],
        deletedCount: 0,
      })
    }

    // Xóa vĩnh viễn các bản trùng
    // Xóa liên kết trước (project_members, tasks, project_checklists, etc.)
    for (const id of idsToDelete) {
      try {
        // Xóa project_members
        await supabaseAdmin
          .from('project_members')
          .delete()
          .eq('project_id', id)
      } catch {}

      try {
        // Xóa checklist_items thuộc project_checklists
        const { data: checklists } = await supabaseAdmin
          .from('project_checklists')
          .select('id')
          .eq('project_id', id)
        
        if (checklists && checklists.length > 0) {
          for (const cl of checklists) {
            try {
              await supabaseAdmin
                .from('checklist_items')
                .delete()
                .eq('checklist_id', cl.id)
            } catch {}
          }
        }
      } catch {}

      try {
        // Xóa project_checklists
        await supabaseAdmin
          .from('project_checklists')
          .delete()
          .eq('project_id', id)
      } catch {}

      try {
        // Xóa tasks
        await supabaseAdmin
          .from('tasks')
          .delete()
          .eq('project_id', id)
      } catch {}

      try {
        // Xóa incidents
        await supabaseAdmin
          .from('incidents')
          .delete()
          .eq('project_id', id)
      } catch {}

      try {
        // Xóa improvements
        await supabaseAdmin
          .from('improvements')
          .delete()
          .eq('project_id', id)
      } catch {}

      try {
        // Xóa project_activities
        await supabaseAdmin
          .from('project_activities')
          .delete()
          .eq('project_id', id)
      } catch {}
    }

    // Xóa các dự án trùng
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      return NextResponse.json(
        { error: `Lỗi khi xóa dự án trùng: ${deleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa ${idsToDelete.length} dự án trùng lặp thành công.`,
      deleted: deletedDetails,
      deletedCount: idsToDelete.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi server' },
      { status: 500 }
    )
  }
}

