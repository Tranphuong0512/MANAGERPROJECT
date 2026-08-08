import { NextRequest, NextResponse } from 'next/server'
import { updateProjectSchema } from '@/lib/schemas'
import { authenticateApiRequest } from '@/lib/api-auth'
import { executeBiDirectionalSync } from '@/lib/services/apec-bi-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (
        user_id,
        role_id,
        user_roles (name)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, userId, organizationId } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = updateProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: (validation.error as any).errors }, { status: 400 })
    }

    // Query existing project to increment version
    const { data: currentProject } = await supabase.from('projects').select('version, change_count').eq('id', id).single()

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
        version: (currentProject?.version || 0) + 1,
        change_count: (currentProject?.change_count || 0) + 1,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Record in history if user ID exists
    if (userId) {
      await supabase.from('project_history').insert([
        {
          project_id: id,
          action: 'updated',
          changed_by: userId,
          version: data.version,
        },
      ])
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Project Update)
    await executeBiDirectionalSync({
      entityType: 'project',
      action: 'UPDATE',
      data,
      organizationId: data.organization_id,
      changedBy: userId,
    });

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Project Delete)
    await executeBiDirectionalSync({
      entityType: 'project',
      action: 'DELETE',
      data: { id, ids: [id] },
      organizationId,
    });

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
